import L from 'leaflet';

export const loadGeoJson = async(url, options) => {
    const response = await fetch(url)
    const jsonData = await response.json()

    return L.geoJson(jsonData, options(jsonData))
}

