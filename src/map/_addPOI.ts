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

export const addPointsOfInterestsTomap = async (
    filename: string,
    layerGroup: L.LayerGroup,
    propertyOverrides: {
        description?: (properties: any) => string | string;
        link?: (properties: any) => string | string;
    } = {},
) => {
    let json = await (await fetch(filename)).json();
    let iconDict = {};

    for (let point of json['features']) {
        let { name, description, category, link } = point.properties;
        const descriptionOverride =
            typeof propertyOverrides.description === 'function'
                ? propertyOverrides.description(point.properties)
                : propertyOverrides.description;
        description = descriptionOverride || description;
        link = propertyOverrides.link || link;

        const lng = point.geometry.coordinates[0];
        const lat = point.geometry.coordinates[1];

        // Load the icon
        if (!iconDict[category]) iconDict[category] = new centeredIcon({ iconUrl: './img/icons/' + category + '.png' });

        // Add links
        if (link && description) {
            const props = link[0] != '#' ? `target="_blank` : ``;
            description = `${description}<br><a href="${link}" ${props}">Read more here</a>`;
        }

        // Add the marker
        const content = `<h3>${name}</h3> <p>${description}</p>`;
        L.marker([lat, lng], { icon: iconDict[category] }).addTo(layerGroup).bindPopup(content);
    }
};
