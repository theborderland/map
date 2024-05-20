import L from 'leaflet';

const iconsSize = 32;
const iconAnchor = iconsSize * 0.5;
const centeredIcon: any = L.Icon.extend({
    options: {
        iconSize: [iconsSize, iconsSize],
        iconAnchor: [iconAnchor, iconAnchor],
        popupAnchor: [0, -iconsSize * 0.25],
    },
});

export const addPointsOfInterestsTomap = async (filename: string, layerGroup: L.LayerGroup) => {
    let json = await (await fetch(`./data/bl24/poi/${filename}`)).json();
    let iconDict = {};

    for (let place of json['features']) {
        let { name, description, category, link } = place.properties;

        const lng = place.geometry.coordinates[0];
        const lat = place.geometry.coordinates[1];

        // Load the icon
        if (!iconDict[category]) iconDict[category] = new centeredIcon({ iconUrl: './img/icons/' + category + '.png' });

        // Add links
        if (link && description) {
            const props = link[0] != '#' ? `target="_blank` : ``;
            description = `<a href="${link}" ${props}">${description}</a>`;
        }

        // Add the marker
        const content = `<h3>${name}</h3> <p>${description}</p>`;
        L.marker([lat, lng], { icon: iconDict[category] }).addTo(layerGroup).bindPopup(content);
    }
};
