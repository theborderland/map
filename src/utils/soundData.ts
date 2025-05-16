const directionMap = {
    N: 'North',
    NE: 'North East',
    E: 'East',
    SE: 'South East',
    S: 'South',
    SW: 'South West',
    W: 'West',
    NW: 'North West',
};

// TODO: These are made up
export const soundLimits = {
    "sound_a": 20000,
    "sound_b": 15000,
    "sound_c": 50000,
    "sound_d": 2000,
    "sound_e": 120
}

export const soundSpotType = "soundspotfeature";

export const soundPropertyKey = "soundlevel";

export const getSoundspotDescription = (properties) => {
    let baseDescription = `If you want to host a music/rave camp this is a recommended spot, read more in the sound guide`;

    if (properties[soundPropertyKey]) {
        baseDescription += `<br>Sound class: <b>${properties[soundPropertyKey].at(-1).toUpperCase()}</b>`;
    }

    if (properties.preferred_direction) {
        baseDescription += `<br>Speaker direction: <b>${directionMap[properties.preferred_direction]}</b>`;
    }
    return baseDescription;
};