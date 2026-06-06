
// TODO: These are made up (wattage)
export const soundLimits = {
    "A": 20000,
    "B": 15000,
    "C": 50000,
    "D": 2000,
    "E": 120,
    "F": 50,
}

export const soundLayers = ['A', 'B', 'C', 'D', 'E', 'F'];
export const soundSpotType = "soundspotfeature";
export const soundPropertyKey = "sound-class";
const soundDirectionKey = "sound-direction-azimuth";
const soundDirectionCommentKey = "sound-direction-comment";

export const getSoundspotDescription = (properties: any) => {
    let baseDescription = `<h3>${properties.title}</h3>`;
    baseDescription += `<p>${properties.description}</p>`;

    if (properties[soundPropertyKey]) {
        baseDescription += `Sound class: <b>${properties[soundPropertyKey]}</b>`;
    }

    if (properties[soundDirectionKey]) {
        baseDescription += `<br>Speaker direction: <b>${azimuthToDirection(properties[soundDirectionKey])}</b> ${properties[soundDirectionCommentKey]}`;
    }
    return baseDescription;
};

function azimuthToDirection(degrees: number): string {
    // Normalize to 0–359
    degrees = ((degrees % 360) + 360) % 360;

    const directions = [
        "North",
        "North-East",
        "East",
        "South-East",
        "South",
        "South-West",
        "West",
        "North-West"
    ];

    // 360 / 8 = 45 degrees per direction
    const index = Math.round(degrees / 45) % 8;

    return directions[index];
}