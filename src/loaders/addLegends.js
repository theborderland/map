import L from 'leaflet';

export const addLegends = async (map) => 
{
    var slopeLegend = L.control({position: 'bottomleft'});

    slopeLegend.onAdd = function (map) 
    {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML +='<img src="./img/slopelegend.png" alt="legend" width="100" height="141">';
        return div;
    };

    var soundLegend = L.control({position: 'bottomleft'});

    soundLegend.onAdd = function (map) 
    {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<img src="./img/soundlegend.png" alt="legend" width="100" height="141">';
        return div;
    };

    map.on('overlayadd', function (eventLayer) 
    {
        console.log(eventLayer.name);
        if (eventLayer.name === 'Slope map') slopeLegend.addTo(this);
        else if (eventLayer.name === 'Sound guide') soundLegend.addTo(this);
    });

    map.on('overlayremove', function (eventLayer) 
    {
        if (eventLayer.name === 'Slope map') this.removeControl(slopeLegend);
        else if (eventLayer.name === 'Sound guide') this.removeControl(soundLegend);
    });
};
