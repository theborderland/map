export function getStyleFunction(name) {
    return function (feature) {

        const baseStyle = {
            opacity: 1,
            fillOpacity: 0,
            weight: 1.5,
            dashArray: '5',
        };

        switch (name) {
        case 'naturereserve':
            return {
            ...baseStyle,
            color: '#00b521',
            };
        case 'propertyborder':
            return {
            ...baseStyle,
            color: '#e7e309',
            };
        case 'friends':
            return {
            ...baseStyle,
            color: 'turquoise',
            };
        case 'fireroad': 
            return {
            ...baseStyle,
            dashArray: '0',
            weight: 1,
            color: 'red',
            };
        case 'lowprio':
            return {
            ...baseStyle,
            dashArray: '0',
            color: 'grey',
            fillOpacity: 0.25,
            };
        case 'mediumprio':
            return {
            ...baseStyle,
            dashArray: '0',
            color: 'darkgrey',
            fillOpacity: 0.25,
            };
        case 'highprio':
            return {
            ...baseStyle,
            dashArray: '0',
            color: 'turquoise',
            fillOpacity: 0.25,
            };
        default:
            return {
            ...baseStyle,
            color: 'black',
            };
        }
  };
}
export function getStyle(name) {
    switch (name) {
        case 'naturereserve':
            return {
                fillColor: '#E31A1C',
                weight: 5,
                opacity: 1,
                color: '#ff7800',
                dashArray: '9',
                fillOpacity: 0,
            };
        case 'zones':
            return {
                weight: 1,
                opacity: 0.75,
                color: 'yellow',
                dashArray: '5',
                fillOpacity: 0,
                zIndex: 0,
            };
        case 'fire':
            return {
                weight: 5,
                opacity: 0.75,
                color: '#ff3322',
                fillOpacity: 0,
            };
        case 'campclusters':
            return {
                weight: 3,
                opacity: 0.5,
                color: 'lightgrey',
                fillOpacity: 0.25,
                fillColor: 'grey',
                zIndex: 10,
            };
        case 'campcircles':
            return {
                weight: 3,
                opacity: 0.25,
                color: 'yellow',
                fillOpacity: 0,
                radius: 12.5,
            };
        default:
            return {
                weight: 1,
                opacity: 1,
                fillOpacity: 0,
            };
    }
}
