import L from "leaflet";
import DOMPurify from "dompurify";

const iconsSize = 32;
const iconAnchor = iconsSize * 0.5;
const centeredIcon: any = L.Icon.extend({
    options: {
        iconSize: [iconsSize, iconsSize],
        iconAnchor: [iconAnchor, iconAnchor],
        popupAnchor: [0, -iconsSize * 0.25],
    },
});

export type PoiOverrides = {
    description?: ((properties: any) => string) | string;
    link?: string;
};

export const createIconCache = () => new Map<string, L.Icon>();

/** Icons are either a full url or a bare name like "toilet", which lives in ./img/icons/. */
function resolveIconUrl(icon: string): string {
    if (/^(https?:|data:|\/|\.\/)/.test(icon)) return icon;
    return "./img/icons/" + (/\.(png|svg|jpe?g|webp)$/i.test(icon) ? icon : icon + ".png");
}

/** Adds one point feature as a marker (or a colored dot when it has a `fill`) with a popup. */
export const addPointOfInterest = (
    point: any,
    layerGroup: L.LayerGroup,
    propertyOverrides: PoiOverrides = {},
    isCleanAndQuietMode: boolean = false,
    iconCache: Map<string, L.Icon> = createIconCache(),
) => {
    let { name, category, link, fill } = point.properties;
    let description =
        typeof propertyOverrides.description === "function"
            ? propertyOverrides.description(point.properties)
            : propertyOverrides.description ?? point.properties.description;
    link = propertyOverrides.link || link;

    const [lng, lat] = point.geometry.coordinates;

    // Add links
    if (link && description && !isCleanAndQuietMode) {
        const props = link[0] != "#" ? `target="_blank"` : ``;
        description = `${description}<br><a href="${link}" ${props}>Read more here</a>`;
    }

    // Popup content can now come from the API, so sanitize it before it ends up in the DOM.
    const content = DOMPurify.sanitize(`${name ? `<h3>${name}</h3>` : ""}<p>${description ?? ""}</p>`, {
        ADD_ATTR: ["target"],
    });

    if (fill || !category) {
        L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: fill ?? "#3388ff",
            fillOpacity: 1,
            weight: 2, // border width
            color: "#000000", // border color
            opacity: 0.5, // border opacity
        }).addTo(layerGroup).bindPopup(content);
        return;
    }

    if (!iconCache.has(category)) {
        iconCache.set(category, new centeredIcon({ iconUrl: resolveIconUrl(category) }));
    }
    L.marker([lat, lng], { icon: iconCache.get(category) }).addTo(layerGroup).bindPopup(content);
};

/**
 * Loads points from a geojson url (e.g. the external sound spots) and adds them as POIs.
 * The app's own POIs come from the API, see loadApiLayers.
 */
export const addPointsOfInterestsTomap = async (
    filename: string,
    layerGroup: L.LayerGroup,
    propertyOverrides: PoiOverrides = {},
    isCleanAndQuietMode: boolean = false,
) => {
    const json = await (await fetch(filename)).json();
    const iconCache = createIconCache();
    for (const point of json["features"]) {
        addPointOfInterest(point, layerGroup, propertyOverrides, isCleanAndQuietMode, iconCache);
    }
};
