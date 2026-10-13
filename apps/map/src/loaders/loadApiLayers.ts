import L from "leaflet";
import "leaflet.pattern";
import * as Turf from "@turf/turf";
import { fetchMapData } from "../api/mapDataApi";
import { applyStyleOverride, buildStyleMap, FALLBACK_STYLE } from "../api/styles";
import type {
    ApiGeometry,
    AreaResponseDto,
    AttachedRuleDto,
    PoiResponseDto,
    RoadResponseDto,
    RuleResponseDto,
} from "../api/types";
import { addPointOfInterest, createIconCache } from "./_addPOI";

/** The area that a rule applies to: every feature the rule is attached to, buffered by its distanceMeters. */
export interface ApiRuleZone {
    rule: RuleResponseDto;
    layer: L.GeoJSON;
}

type MapWithGroups = L.Map & { groups: any; apiRuleZones?: ApiRuleZone[] };

// Style types that are toggled as their own layer, or grouped later by createMap().
// Everything else ends up in the "Roads etc." (mapstuff) layer.
const STANDALONE_GROUPS = new Set(["plaza", "neighbourhood", "kidszones", "waterProtectedZone"]);

// These groups are read by createMap() even when the API has no features for them.
const REQUIRED_GROUPS = ["plaza", "neighbourhood"];

/** Parses the untyped API geometry into a GeoJSON geometry, or null if it is empty/unusable. */
function parseGeometry(raw: ApiGeometry | undefined): GeoJSON.Geometry | null {
    let geometry: any = raw;
    if (typeof geometry === "string") {
        try {
            geometry = JSON.parse(geometry);
        } catch {
            return null;
        }
    }
    // Be lenient if the backend ever sends a full Feature instead of a bare geometry.
    if (geometry?.type === "Feature") {
        geometry = geometry.geometry;
    }
    if (!geometry?.type || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
        return null;
    }
    return geometry as GeoJSON.Geometry;
}

/** Buffers a feature, falling back to the original if turf cannot buffer it (e.g. degenerate geometry). */
function bufferFeature(feature: GeoJSON.Feature, meters: number): GeoJSON.Feature {
    const buffered = Turf.buffer(feature as any, meters, { units: "meters" });
    return (buffered as GeoJSON.Feature) ?? feature;
}

function isPolygonal(feature: GeoJSON.Feature): boolean {
    return feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon";
}

/** Invisible styles (no stroke, no fill) are not worth adding to the map, they only cost render time. */
function isInvisible(style: L.PathOptions): boolean {
    return style.stroke === false && !style.fillOpacity;
}

/**
 * Decides which geometry a rule is checked against: the geometry as drawn (roads already buffered
 * by bufferMeters), with distanceMeters added on top of that. No distance means the drawn geometry itself.
 */
function getZoneFeature(drawn: GeoJSON.Feature, distanceMeters: number | null | undefined): GeoJSON.Feature {
    if (!distanceMeters || distanceMeters <= 0) return drawn;
    return bufferFeature(drawn, distanceMeters);
}

/** Water protection zones are drawn with a stripe pattern, which a plain style row cannot describe. */
function createWaterZoneStyle(map: L.Map): L.PathOptions {
    const stripes = new L.StripePattern({
        patternContentUnits: "objectBoundingBox",
        patternUnits: "objectBoundingBox",
        weight: 0.02,
        spaceWeight: 0.02,
        height: 0.04,
        angle: 45,
        color: "#2666cd",
        opacity: 0.5,
        spaceColor: "#757575",
        spaceOpacity: 0.8,
    });
    stripes.addTo(map);
    return { color: "#2666cd", fillPattern: stripes, fillOpacity: 1 };
}

/**
 * Loads areas, roads, pois, rules and styles from the API and creates the layer groups
 * (map.groups[styleType]) that used to come from the static geojson files.
 * It also builds one rule zone per rule, stored on map.apiRuleZones for the rule engine.
 *
 * Note this mutates the map object.
 */
export async function loadApiLayers(map: MapWithGroups, isCleanAndQuietMode: boolean = false): Promise<void> {
    const data = await fetchMapData();
    const styles = buildStyleMap(data.styles);
    const rulesById = new Map<string, RuleResponseDto>(data.rules.map((rule) => [rule.id, rule]));

    const zoneFeatures = new Map<string, GeoJSON.Feature[]>();
    const featuresByType = new Map<string, GeoJSON.Feature[]>();

    /** Adds the feature to every rule zone attached to it. */
    const attachRules = (
        attachments: AttachedRuleDto[] | null | undefined,
        drawn: GeoJSON.Feature,
        label: string,
    ): void => {
        for (const attached of attachments ?? []) {
            const rule = rulesById.get(attached.ruleId);
            if (!rule) {
                console.warn(`[loadApiLayers] ${label} references unknown rule ${attached.ruleId}`);
                continue;
            }
            const zone = getZoneFeature(drawn, attached.distanceMeters);
            if (isPolygonal(zone)) {
                const list = zoneFeatures.get(rule.id) ?? [];
                list.push(zone);
                zoneFeatures.set(rule.id, list);
            } else {
                // turf can only compare polygons with polygons, so a bare line/point needs a buffer or distance.
                console.warn(`[loadApiLayers] ${label} has rule "${rule.name}" but no distance/buffer, skipping its zone`);
            }
        }
    };

    // Areas and roads are drawn as polygon layers, one group per style type.
    const polygonSources: Array<{ dto: AreaResponseDto | RoadResponseDto; bufferMeters: number }> = [
        ...data.areas.map((dto) => ({ dto, bufferMeters: 0 })),
        ...data.roads.map((dto) => ({ dto, bufferMeters: dto.bufferMeters ?? 0 })),
    ];
    for (const { dto, bufferMeters } of polygonSources) {
        const geometry = parseGeometry(dto.geometry);
        if (!geometry) continue; // needs coordinates to be added, same as before

        const type = dto.styleType ?? "unstyled";
        const raw: GeoJSON.Feature = {
            type: "Feature",
            geometry,
            properties: { id: dto.id, name: dto.name, tagline: dto.tagline, type },
        };
        const drawn = bufferMeters > 0 ? bufferFeature(raw, bufferMeters) : raw;

        attachRules(dto.rules, drawn, `${type} "${dto.name}"`);

        const list = featuresByType.get(type) ?? [];
        list.push(drawn);
        featuresByType.set(type, list);
    }

    // Create one layer per style type
    for (const [type, features] of featuresByType) {
        let baseStyle = styles.get(type) ?? FALLBACK_STYLE;
        if (!styles.has(type)) console.warn(`[loadApiLayers] no style for styleType "${type}", using fallback`);
        if (type === "waterProtectedZone") {
            baseStyle = { ...baseStyle, ...createWaterZoneStyle(map) };
        }

        const layer = L.geoJSON({ type: "FeatureCollection", features } as GeoJSON.FeatureCollection, {
            style: () => ({ ...baseStyle }),
        });
        map.groups[type] = layer;
        if (!STANDALONE_GROUPS.has(type) && !isInvisible(baseStyle)) {
            layer.addTo(map.groups.mapstuff);
        }
    }
    for (const name of REQUIRED_GROUPS) {
        map.groups[name] ??= L.geoJSON();
    }

    // POIs
    const iconCache = createIconCache();
    for (const poi of data.pois as PoiResponseDto[]) {
        const geometry = parseGeometry(poi.geometry);
        if (!geometry) continue;

        const raw: GeoJSON.Feature = { type: "Feature", geometry, properties: { name: poi.name } };
        // A bare point cannot be a rule zone, so POI rules only count when they have a distance.
        attachRules(poi.rules, raw, `poi "${poi.name}"`);

        // One POI can hold several points (MultiPoint), each gets its own marker.
        const points =
            geometry.type === "Point" ? [geometry.coordinates] : geometry.type === "MultiPoint" ? geometry.coordinates : [];
        const style = styles.get(poi.styleType ?? "");
        for (const coordinates of points) {
            addPointOfInterest(
                {
                    type: "Feature",
                    geometry: { type: "Point", coordinates },
                    properties: {
                        name: poi.name,
                        description: poi.description ?? poi.tagline,
                        link: poi.link,
                        category: poi.icon ?? undefined,
                        // POIs without an icon fall back to a colored dot in their style's color
                        fill: poi.icon ? undefined : style?.fillColor ?? FALLBACK_STYLE.color,
                    },
                },
                map.groups.poi,
                {},
                isCleanAndQuietMode,
                iconCache,
            );
        }
    }

    // Rule zones, in the order the API returned the rules (severity, then name)
    map.apiRuleZones = data.rules
        .filter((rule) => zoneFeatures.has(rule.id))
        .map((rule) => ({
            rule,
            layer: L.geoJSON(
                { type: "FeatureCollection", features: zoneFeatures.get(rule.id)! } as GeoJSON.FeatureCollection,
                { interactive: false },
            ),
        }));
}
