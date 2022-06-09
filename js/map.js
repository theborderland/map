var map = L.map('map', { zoomControl: false }).setView([57.621111, 14.927857], 17);

// Add Leaflet-locatecontrol plugin 
L.control.locate(setView='once',
                 keepCurrentZoomLevel=true,
                 returnToPrevBounds=true,
                 drawCircle=false, flyTo=true).addTo(map);

// map.createPane('labels');
// map.getPane('labels').style.zIndex = 650; // This pane is above markers but below popups
// map.getPane('labels').style.pointerEvents = 'none'; // Layers in this pane are non-interactive and do not obscure mouse/touch events

//ZONES
fetch('https://sheets.googleapis.com/v4/spreadsheets/1HBERVykwMRDlTGQpOJHmoeDSLVcGriB9V4-FU_F8iag/values/zones!A2:F30?alt=json&key=AIzaSyAwMjpopKPH4_7Kn8qNhrOGz4c-JBv3QG0').then(resp => resp.json()).then(resp => 
{
    let zonedata = resp.values;
    
    fetch('./data/zone.geojson').then(response => response.json()).then(response => 
    {
        L.geoJson(response, {style: function(feature) 
        {
            let color = 'yellow';

            //ok, really messy to have this in here. Where should it go?
            for (let i = 0; i < zonedata.length; i++)
            {
                if (zonedata[i][0] == feature.properties.fid)
                {
                    feature.properties.sheetname = zonedata[i][1];
                    feature.properties.notice = zonedata[i][2];
                    feature.properties.sound = zonedata[i][3];
                    feature.properties.description = zonedata[i][4];
                    break;
                }
            }

            return {
                "weight": 3,
                "opacity": 0.75,
                "color": color,
                "dashArray": '5',
                "fillOpacity": 0,
                "zIndex": 0
            };
        }} )
        .addTo(map)
        .eachLayer(function (layer) 
        { 
            let notice = "";
            if (layer.feature.properties.notice) notice = "<h3>" + layer.feature.properties.notice + "</h3>";
            
            let sound = "";
            if (layer.feature.properties.sound) sound = "<B>Sound:</B> " + layer.feature.properties.sound + "<BR><BR>";

            let description = "";
            if (layer.feature.properties.description) description = "<B>Description:</B> " + layer.feature.properties.description + "<BR>";

            content = "<h2>" + layer.feature.properties.sheetname + "</h2>" 
            + sound
            + notice
            + description;
            layer.bindPopup(content);
            layer.bringToBack();
        });
    });

});

//NATURE RESERVE
fetch('./data/naturereserve.geojson').then(response => response.json()).then(response => 
{
    L.geoJson(response, {style: getStyle(response.name)} ).addTo(map)
    .eachLayer(function (layer) {layer.bindPopup('<H2>Nature Reserve</H2>')});
});

//FIRE ROADS
fetch('./data/fire.geojson').then(response => response.json()).then(response => 
{
    L.geoJson(response, {style: getStyle(response.name)} ).addTo(map);
    // .eachLayer(function (layer) {layer.bindPopup(layer.feature.properties.fid)});
});

//CAMP CLUSTERS
fetch('https://sheets.googleapis.com/v4/spreadsheets/1HBERVykwMRDlTGQpOJHmoeDSLVcGriB9V4-FU_F8iag/values/allclusters!A2:H150?alt=json&key=AIzaSyAwMjpopKPH4_7Kn8qNhrOGz4c-JBv3QG0').then(resp => resp.json()).then(resp => 
{
    let sheetdata = resp.values;
    
    fetch('./data/areas.geojson').then(response => response.json()).then(response => 
    {
        L.geoJson(response, {style: function(feature) 
        {
            let color = '#03d7fc';
            let fillOpacity = 0.5;

            //loop through sheetdata and add it to each feature
            for (let i = 0; i < sheetdata.length; i++)
            {
                if (sheetdata[i][0] == feature.properties.fid)
                {
                    feature.properties.sheetname = sheetdata[i][2];
                    feature.properties.maxarea = sheetdata[i][3];
                    feature.properties.reservedarea = sheetdata[i][4];
                    feature.properties.notice = sheetdata[i][5];
                    feature.properties.description = sheetdata[i][6];

                    if (sheetdata[i][1] == 'art') color = 'purple';
                    else if (sheetdata[i][1] == 'camp') color = '#03d7fc';
                    else if (sheetdata[i][1] == 'parking') color = 'grey';
                    else if (sheetdata[i][1] == 'sound') color = 'blue';
                    else if (sheetdata[i][1] == 'bridge') color = 'yellow';
                    else if (sheetdata[i][1] == 'building') color = 'brown';
                    
                    if (sheetdata[i][1] == 'camp' || sheetdata[i][1] == 'art' || sheetdata[i][1] == 'building')
                    {
                        fillOpacity = 0;
                        if (feature.properties.reservedarea > 500)
                        {
                            color = 'red';
                            fillOpacity = 0.5;
                        }
                        else if (feature.properties.reservedarea > 0)
                        {
                            fillOpacity = (feature.properties.reservedarea / feature.properties.maxarea) * 0.75;
                        }
                    }
                    break;
                }
            }

            return {
                "color": color,
                "fillColor": color,
                "weight": 2,
                "opacity": 0.5,
                "fillOpacity": fillOpacity
            };
        }, onEachFeature: function(feature,layer)
            {
                layer.bindTooltip("<span style='color: white; text-shadow: 2px 2px #000000; font-weight: bold'>"+feature.properties.sheetname+"</span>",{permanent:true,direction:'center'});
            } })
        .addTo(map)
        .eachLayer(function (layer) 
        { 
            let name = "";
            if (layer.feature.properties.sheetname)
            {
                name = layer.feature.properties.sheetname;
            }
            else name = layer.feature.properties.fid;

            let area = "";
            if (layer.feature.properties.reservedarea)
            {
                area = layer.feature.properties.reservedarea + " sqm reserved of " + layer.feature.properties.maxarea + " sqm.<BR>";
            }

            let notice = "";
            if (layer.feature.properties.notice) notice = "<h3>" + layer.feature.properties.notice + "</h3>";

            let description = "";
            if (layer.feature.properties.description) description = "<B>Description:</B> " + layer.feature.properties.description + "<BR>";

            content = "<h2>" + name + "</h2>" 
            + area
            + notice
            + description;

            layer.bindPopup(content)
            layer.bringToFront();
        });
    });
});

//MAP BASE LAYER
// var mapBoxtiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
//     maxZoom: 20,
//     attribution: 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
//     id: 'mapbox/satellite-v9',
//     tileSize: 512,
//     zoomOffset: -1
// }).addTo(map);

var googleSatellite = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
}).addTo(map);