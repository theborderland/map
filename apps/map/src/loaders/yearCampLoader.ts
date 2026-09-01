import { MapEntity } from '../entities';

// Read the year from query string "?year=xxxx"
export function getYearFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const yearValue = params.get('year');
    if (!yearValue) return null;
    
    const year = Number(yearValue);
    return Number.isFinite(year) && year >= 1900 ? year : null;
}

/**
 * Fetches the anonymized archived camp geojson for a specific year
 */
export class YearCampLoader {
    constructor(
        private readonly year: number | null,
    ) { }

    public async load(): Promise<MapEntity[]> {
        if (this.year == null) {
            return [];
        }

        const pathToFile = `/data/bl${String(this.year).slice(-2)}/all_camps.geojson`;
        let loaded: any = null;

        try {
            const response = await fetch(pathToFile, { cache: 'no-store' });
            if (!response.ok) throw new Error("Error loading file");
            loaded = await response.json();
        } catch (error) {
            console.warn('[YearCampLoader]', 'Static camp export not found at', pathToFile, error);
        }

        if (!loaded || !Array.isArray(loaded.features)) {
            throw new Error(`Could not load a static camp export for year ${this.year}`);
        }

        const entities: MapEntity[] = [];
        for (const [index, feature] of loaded.features.entries()) {
            if (!feature || feature.type !== 'Feature') continue;

            entities.push(
                new MapEntity({
                    id: Number(feature.id ?? index + 1),
                    revision: 1,
                    timeStamp: Date.now(),
                    isDeleted: false,
                    deleteReason: '',
                    geoJson: JSON.stringify(feature),
                }, [])
            );
        }

        return entities;
    }
}
