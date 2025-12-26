import L from 'leaflet';
import { POWER_GRID_GEOJSON_URL } from '../../SETTINGS';

export const addPowerGridTomap = async (layerGroup: L.LayerGroup) => {
    try {
        let json = await (await fetch(POWER_GRID_GEOJSON_URL)).json()

        for (let feature of json['features']) {
            if (feature.geometry.type != 'Point') {
                continue;
            }
            let name = feature.properties['name'];
            let marker_size = feature.properties['marker-size'] ?? 1;
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
