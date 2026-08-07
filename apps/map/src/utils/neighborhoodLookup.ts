// Provide a geojson and coordinate. 
// Returns the neighbourhood name

import * as turf from "@turf/turf";

type NeighbourhoodFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  {
    name: string;
    tagline: string;
    camping_allowed: boolean;
    _name: string | null;
  }
>;

export class NeighbourhoodLookup {
  private features: NeighbourhoodFeature[] = [];

  /**
   * Load the GeoJSON file.
   * Call this once when your app starts.
   */
  async load(url: string): Promise<void> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load neighbourhoods: ${response.status}`);
    }

    const geojson = (await response.json()) as GeoJSON.FeatureCollection<
      GeoJSON.Polygon | GeoJSON.MultiPolygon
    >;

    this.features = geojson.features as NeighbourhoodFeature[];
  }

  /**
   * Returns the neighbourhood name for a given coordinate.
   */
  getNeighbourhood(lat: number, lng: number): string | null {
    const point = turf.point([lng, lat]); // GeoJSON = [lng, lat]

    for (const feature of this.features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        return feature.properties.name;
      }
    }

    return null;
  }
}