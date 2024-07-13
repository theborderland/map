import L from 'leaflet';

const POWER_GRID_GEOJSON_URL = 'https://bl.skookum.cc/data/bl24/power_grid.geojson';
const LOCAL_POWER_GRID_GEOJSON_URL = './data/bl24/labels/power_grid.geojson';

async function fetchPowerGrid() {
    try {
        return await (await fetch(POWER_GRID_GEOJSON_URL)).json();
    } catch (err) {
        console.error(err);
        console.warn('Failed to fetch from', POWER_GRID_GEOJSON_URL, 'trying', LOCAL_POWER_GRID_GEOJSON_URL);
        return await (await fetch(LOCAL_POWER_GRID_GEOJSON_URL)).json();
    }
}

export const addPowerGridTomap = async (layerGroup: L.LayerGroup) => {
    try {
        let json = await fetchPowerGrid();

        for (let feature of json['features']) {
            if (feature.geometry.type != 'Point') {
                continue;
            }
            let name = feature.properties['Name'];
            let marker_size = feature.properties['marker-size'];
            let { description, power_size, power_area } = feature.properties;

            const lng = feature.geometry.coordinates[0];
            const lat = feature.geometry.coordinates[1];

            // Create icon
            const iconsSize = 28 + 3 * marker_size;
            const iconAnchor = iconsSize * 0.5;
            const icon: any = new (L.Icon.extend({
                options: {
                    iconSize: [iconsSize, iconsSize],
                    iconAnchor: [iconAnchor, iconAnchor],
                    popupAnchor: [0, -iconsSize * 0.25],
                    iconUrl: './img/icons/powerdot.png',
                },
            }))();

            // Add content
            let content = `<h3>${name}</h3>`;
            if (power_size) {
                content += `<p>Power Size: ${power_size}</p>`;
            }
            if (power_area) {
                content += `<p>Power Area: ${power_area}</p>`;
            }
            if (description) {
                content += `<p>${description}</p>`;
            }

            // Add the marker
            L.marker([lat, lng], { icon }).addTo(layerGroup).bindPopup(content);
        }
    } catch (err) {
        console.error('Failed to add the power grid layer', err);
    }
};
