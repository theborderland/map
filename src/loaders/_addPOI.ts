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
        description?: ((properties: any) => string) | string;
        link?: string;
    } = {},
    isCleanAndQuietMode: boolean = false
) => {
    let json = await (await fetch(filename)).json();
    let iconCache = new Map<string, L.Icon>();

    for (let point of json['features']) {
        let { name, category, link, fill } = point.properties;
        let description =
            typeof propertyOverrides.description === 'function'
                ? propertyOverrides.description(point.properties)
                : propertyOverrides.description ?? point.properties.description;
        link = propertyOverrides.link || link;

        const [lng, lat] = point.geometry.coordinates;

        // Load the icon
        if (!iconCache.has(category)) {
            iconCache.set(category, new centeredIcon({ iconUrl: './img/icons/' + category + '.png' }));
        }

        // Add links
        if (link && description && !isCleanAndQuietMode) {
            const props = link[0] != '#' ? `target="_blank"` : ``;
            description = `${description}<br><a href="${link}" ${props}">Read more here</a>`;
        }

        // Add the marker
        const content = `${name ? `<h3>${name}</h3>` : ''}<p>${description ?? ''}</p>`;
        if (fill) {
            L.circleMarker([lat, lng], {
                radius: 10,
                fillColor: fill,
                fillOpacity: 1,
                weight: 2, // border width
                color: '#000000', // border color
                opacity: 0.5, // border opacity
            }).addTo(layerGroup).bindPopup(content);
        } else {
            L.marker([lat, lng], {
                icon: iconCache.get(category)
            }).addTo(layerGroup).bindPopup(content);
        }
    }
};
