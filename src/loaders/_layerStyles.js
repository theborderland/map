/** Returns a a function that takes a gives back a style definition based on the given name of a geojson feature */
export function getStyleFunction(name) {
    return function () {
        const baseStyle = {
            opacity: 1,
            fillOpacity: 0,
            weight: 1.5,
            dashArray: '5',
        };

        switch (name) {
            case 'container':
                return {
                    ...baseStyle,
                    fillOpacity: 1,
                    color: '#c3c3c3',
                    weight: 0,
                };
            case 'naturereserve':
                return {
                    ...baseStyle,
                    color: '#00b521',
                    weight: 3,
                };
            case 'propertyborder':
                return {
                    ...baseStyle,
                    color: '#e77409',
                    weight: 4,
                };
            case 'friends':
                return {
                    ...baseStyle,
                    color: 'turquoise',
                };
            case 'forbidden':
                return {
                    ...baseStyle,
                    color: 'red',
                    fillOpacity: 0.5,
                };
            case 'toilet':
                return {
                    ...baseStyle,
                    color: 'skyblue',
                    fillOpacity: 1,
                    dashArray: '0',
                };
            case 'bridge':
                return {
                    ...baseStyle,
                    color: 'brown',
                    fillOpacity: 1,
                };
            case 'parking':
                return {
                    ...baseStyle,
                    color: 'lightblue',
                    fillOpacity: 0,
                };
            case 'slope':
                return {
                    ...baseStyle,
                    fillOpacity: 0,
                    opacity: 0,
                };
            case 'fireroad':
                return {
                    ...baseStyle,
                    weight: 1.5,
                    dashArray: '2',
                    color: '#f05039',
                    fillOpacity: 0.15,
                };
            case 'road':
                return {
                    ...baseStyle,
                    weight: 1.5,
                    dashArray: '1.5',
                    color: '#0bf5e5',
                    fillOpacity: 0.15,
                };
            case 'lowprio':
                return {
                    dashArray: '3',
                    color: '#e7e309',
                    fillOpacity: 0,
                    weight: 2,
                };
            case 'hiddenforbidden':
                return {
                    color: '#ff4444',
                    fillOpacity: 0.35,
                    weight: 0,
                };
            case 'mediumprio':
                return {
                    ...baseStyle,
                    dashArray: '0',
                    color: '#e7e309',
                    fillOpacity: 0,
                    weight: 2,
                };
            case 'highprio':
                return {
                    ...baseStyle,
                    dashArray: '0',
                    color: '#e7e309',
                    fillOpacity: 0,
                    weight: 2,
                };
            case 'soundhigh':
                return {
                    ...baseStyle,
                    color: '#b60d0d',
                    fillOpacity: 0.75,
                    weight: 0,
                };
            case 'soundmedium':
                return {
                    ...baseStyle,
                    color: '#ff6f16',
                    fillOpacity: 0.75,
                    weight: 0,
                };
            case 'soundmediumlow':
                return {
                    ...baseStyle,
                    color: '#f4e512',
                    fillOpacity: 0.75,
                    weight: 0,
                };
            case 'soundlow':
                return {
                    ...baseStyle,
                    color: '#00e300',
                    fillOpacity: 0.75,
                    weight: 0,
                };
            case 'soundquiet':
                return {
                    ...baseStyle,
                    color: '#29b6f3',
                    fillOpacity: 0.75,
                    weight: 0,
                };

            default:
                return {
                    ...baseStyle,
                    color: 'black',
                };
        }
    };
}
