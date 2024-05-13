export function encodeHashMeta(layers) {
    if (layers instanceof Set) {
        layers = Array.from(layers);
    }

    const hashMeta = [];

    if (layers.length > 0) {
        hashMeta.push('layers:' + layers.join(','));
    }

    return hashMeta;
}

export function decodeHashMeta(hashMeta) {
    const layersKey = 'layers:';
    const layersVal = hashMeta.find((val) => val.startsWith(layersKey));

    const layers = layersVal ? layersVal.substring(layersKey.length).split(',') : [];

    return { layers };
}
