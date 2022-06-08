function getStyle(name) 
{
    switch (name) 
    {
        case 'naturereserve': 
            return {
                "fillColor": '#E31A1C',
                "weight": 1,
                "opacity": 1,
                "color": '#ff7800',
                "dashArray": '5',
                "fillOpacity": 0
            };
        case 'zones':   
            return {
                "weight": 2,
                "opacity": 0.75,
                "color": 'yellow',
                "dashArray": '5',
                "fillOpacity": 0,
                "zIndex": 0
            };
        case 'fire': 
            return {
                "weight": 3,
                "opacity": 0.75,
                "color": '#ff3322',
                "fillOpacity": 0
            };
        case 'campclusters':   
            return {
                "weight": 3,
                "opacity": 0.5,
                "color": 'lightgrey',
                "fillOpacity": 0.25,
                "fillColor": 'grey',
                "zIndex": 10
            };
        case 'campcircles':   
            return {
                "weight": 3,
                "opacity": 0.25,
                "color": 'yellow',
                "fillOpacity": 0,
                "radius": 12.5
            };
        default:           
            return {
                "weight": 1,
                "opacity": 1,
                "fillOpacity": 0
            };
    }
}