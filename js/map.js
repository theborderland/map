var geojsonFiles = ['./data/naturereserve.geojson'];

var map = L.map('map', { zoomControl: false }).setView([57.621111, 14.927857], 17);

// Add Leaflet-locatecontrol plugin 
L.control.locate(setView='once',
                 keepCurrentZoomLevel=true,
                 returnToPrevBounds=true,
                 drawCircle=false, flyTo=true).addTo(map);


// map.createPane('labels');
// map.getPane('labels').style.zIndex = 650; // This pane is above markers but below popups
// map.getPane('labels').style.pointerEvents = 'none'; // Layers in this pane are non-interactive and do not obscure mouse/touch events



//ADD POINTS AS CIRCLES
// function createCircles (feature, latlng) 
// {
//   return L.circle(latlng)
// }

// fetch('./data/campcircles.geojson').then(response => response.json()).then(response => 
//     {
//         L.geoJson(response, {style: getStyle(response.name), onEachFeature: onEachFeature, pointToLayer: createCircles} )
//         .addTo(map)
//         .eachLayer(function (layer) 
//         {
// 		    layer.bindPopup(layer.feature.properties.name);
//             // .bindTooltip(layer.feature.properties.name);
// 	    });
//     });

// HIGHLIGHT FEATURES WITH BORDER
//  --------------------------------
// let highlightedLayer = null;
// let highlightedLayerStyle = null;

// function highlightFeature(e) {
//     var layer = e.target;
//     highlightedLayer = layer;
//     highlightedLayerStyle = layer.options.style;

//     layer.setStyle({ weight: 6 });
// }

//Reset object when deselected
// map.on('popupclose', function(ev) {
//     if (highlightedLayer) 
//     {
//         highlightedLayer.setStyle(highlightedLayerStyle);
//         highlightedLayer = null;
//         highlightedLayerStyle = null;
//     }
// });

function onEachFeature(feature, layer) 
{
    // layer.on({
    //     // mouseover: highlightFeature,
    //     // mouseout: resetHighlight,
    //     click: highlightFeature
    // });
}
//  --------------------------------

let sheetdata;

fetch('https://sheets.googleapis.com/v4/spreadsheets/1HBERVykwMRDlTGQpOJHmoeDSLVcGriB9V4-FU_F8iag/values/A1:B10?alt=json&key=AIzaSyAwMjpopKPH4_7Kn8qNhrOGz4c-JBv3QG0').then(resp => resp.json()).then(resp => 
{
    //FIXME remove
    // console.log(resp);
    sheetdata = resp.values;
    
    fetch('./data/campclusters.geojson').then(response => response.json()).then(response => 
    {
        L.geoJson(response, {style: function(feature) 
        {
            let color = '#69bfbe';

            //loop thourgh sheetdata
            for (let i = 0; i < sheetdata.length; i++)
            {
                if (sheetdata[i][0] == feature.properties.name)
                {
                    if (sheetdata[i][1] > 490) color = 'red';
                    else if (sheetdata[i][1] > 250) color = 'orange';
                    else if (sheetdata[i][1] > 1) color = 'darkgreen';
                    // else color = 'blue';

                    feature.properties.sqmreserved = sheetdata[i][1];
                    break;

                    // return {
                    //     "color": color,
                    //     "fillColor": color,
                    //     "weight": 3,
                    //     "opacity": 1,
                    //     "fillOpacity": 0.1
                    // };
                }
            }

            return {
                "color": color,
                "fillColor": color,
                "weight": 2,
                "opacity": 1,
                "fillOpacity": 0.1
            };
        }, onEachFeature: matchClusterData} )
        .addTo(map)
        .eachLayer(function (layer) 
        { 
            let name = "";
            if (layer.feature.properties.name == null)
            {
                name = layer.feature.properties.fid;
            }
            else name = layer.feature.properties.name;

            content = "<H3>" + name + "</H3>";
            content += "<B>Reserved: </B>" + layer.feature.properties.sqmreserved;
            layer.bindPopup(content)
        });
    });

});

fetch('https://sheets.googleapis.com/v4/spreadsheets/1HBERVykwMRDlTGQpOJHmoeDSLVcGriB9V4-FU_F8iag/values/zones!A2:D30?alt=json&key=AIzaSyAwMjpopKPH4_7Kn8qNhrOGz4c-JBv3QG0').then(resp => resp.json()).then(resp => 
{
    let zonesdata = resp.values;
    
    fetch('./data/zones.geojson').then(response => response.json()).then(response => 
    {
        L.geoJson(response, {style: function(feature) 
        {
            let color = 'yellow';

            //ok, really messy to have this in here. Where should it go?
            for (let i = 0; i < zonesdata.length; i++)
            {
                if (zonesdata[i][0] == feature.properties.fid)
                {
                    feature.properties.sheetname = zonesdata[i][1];
                    feature.properties.sound = zonesdata[i][2];
                    feature.properties.description = zonesdata[i][3];
                    break;
                }
            }

            return {
                "weight": 2,
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
            content = "<H3>" + layer.feature.properties.sheetname + "</H3>" 
            + "<B>Sound:</B> " + layer.feature.properties.sound 
            + "<BR><BR>" + layer.feature.properties.description;
            layer.bindPopup(content)
        });
    });

});

function matchClusterData(feature, layer) 
{
    // console.log(feature.properties.name);
}

//loop through geojsonfiles, use fetch to download them and add as a layer to the map
for (var i = 0; i < geojsonFiles.length; i++) 
{
    fetch(geojsonFiles[i]).then(response => response.json()).then(response => 
    {
        L.geoJson(response, {style: getStyle(response.name), onEachFeature: onEachFeature} ).addTo(map)
        .eachLayer(function (layer) {layer.bindPopup(layer.feature.properties.name)});
    });
}


fetch('./data/fire.geojson').then(response => response.json()).then(response => 
{
    var options = { corridor: 5, className: 'route-corridor' };

    L.geoJson(response, {style: getStyle(response.name), onEachFeature: onEachFeature} ).addTo(map)
    .eachLayer(function (layer) {layer.bindPopup(layer.feature.properties.fid)});
});


	// //Loop through fire features and add a corridor for all coordinates
	// for (var i = 0; i < fire.features.length; i++) 
    // {
	// 	// console.log(fire.features[i].type + i);
	// 	var coordinates = fire.features[i].geometry.coordinates;
	// 	map.addLayer(L.corridor(coordinates, options));
	// }

var tiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 20,
    attribution: 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/satellite-v9',
    tileSize: 512,
    zoomOffset: -1
}).addTo(map);
