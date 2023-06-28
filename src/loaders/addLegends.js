import L from 'leaflet';

export const addLegends = async (map) => 
{
    var slopeLegend = L.control({position: 'bottomright'});

    slopeLegend.onAdd = function (map) 
    {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML +='<img src="./img/slopelegend.png" alt="legend" width="100" height="141">';
        return div;
    };

    var heightlegend = L.control({position: 'bottomright'});

    heightlegend.onAdd = function (map) 
    {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML +='<img src="./img/heightlegend.png" alt="legend" width="100" height="124">';
        return div;
    };

    var soundLegend = L.control({position: 'bottomright'});

    soundLegend.onAdd = function (map) 
    {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML += '<img src="./img/soundlegend.png" alt="legend" width="150" height="165">';
        return div;
    };

    map.on('overlayadd', function (eventLayer) 
    {
        if (eventLayer.name === 'Slope') slopeLegend.addTo(this);
        else if (eventLayer.name === 'Soundguide') soundLegend.addTo(this);
        else if (eventLayer.name === 'Height') heightlegend.addTo(this);
    });

    map.on('overlayremove', function (eventLayer) 
    {
        if (eventLayer.name === 'Slope') this.removeControl(slopeLegend);
        else if (eventLayer.name === 'Soundguide') this.removeControl(soundLegend);
        else if (eventLayer.name === 'Height') this.removeControl(heightlegend);
    });
};
