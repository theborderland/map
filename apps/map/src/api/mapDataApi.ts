import type { MapData } from "./types";

// API_URL is documented as ending with a slash elsewhere in the app, so strip it
// here and add it back per request. That way both "https://x/" and "https://x" work.
const API_BASE = (process.env.API_URL ?? "").replace(/\/+$/, "");

/** GETs a JSON endpoint and fails loudly, so createMap() can show the "unable to load" notification. */
async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`);
    if (!response.ok) {
        throw new Error(`GET ${path} failed (${response.status})`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error(`GET ${path} did not return an array`);
    }
    return data as T;
}

/** Fetches areas, pois, roads, rules and styles in parallel; they are all needed before anything can be drawn. */
export async function fetchMapData(): Promise<MapData> {
    const [areas, pois, roads, rules, styles] = await Promise.all([
        getJson<MapData["areas"]>("/api/areas"),
        getJson<MapData["pois"]>("/api/pois"),
        getJson<MapData["roads"]>("/api/roads"),
        getJson<MapData["rules"]>("/api/rules"),
        getJson<MapData["styles"]>("/api/styles"),
    ]);
    return { areas, pois, roads, rules, styles };
}
