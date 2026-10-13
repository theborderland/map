import type L from "leaflet";
import type { StyleOverrideDto, StyleResponseDto } from "./types";

/** Used when a feature has a styleType the API has no style for, so it is still visible while being obviously unstyled. */
export const FALLBACK_STYLE: L.PathOptions = {
    color: "black",
    weight: 1.5,
    dashArray: "5",
    fillOpacity: 0,
};

/** Converts an API style into Leaflet path options. */
export function toPathOptions(style: StyleResponseDto): L.PathOptions {
    const weight = style.borderWidth ?? 0;
    return {
        // Leaflet still paints a hairline for weight 0, so turn the stroke off explicitly.
        stroke: weight > 0,
        color: style.borderColor ?? undefined,
        weight,
        opacity: 1,
        fillColor: style.fillColor ?? style.borderColor ?? undefined,
        fillOpacity: style.fillOpacity ?? 0,
        dashArray: style.dashPattern || undefined,
    };
}

/** Indexes styles by their `type`, which is what areas/pois/roads reference in `styleType`. */
export function buildStyleMap(styles: StyleResponseDto[]): Map<string, L.PathOptions> {
    const map = new Map<string, L.PathOptions>();
    for (const style of styles) {
        if (style.type) {
            map.set(style.type, toPathOptions(style));
        }
    }
    return map;
}

/**
 * Applies a rule's style override on top of a base style.
 * Only fillColor decides whether an override exists: the DTO's fillOpacity is a non-nullable
 * number, so rules without an override still arrive with fillOpacity 0.
 */
export function applyStyleOverride(base: L.PathOptions, override?: StyleOverrideDto | null): L.PathOptions {
    if (!override?.fillColor) {
        return base;
    }
    return {
        ...base,
        fillColor: override.fillColor,
        fillOpacity: override.fillOpacity ?? base.fillOpacity,
    };
}
