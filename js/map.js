var geojsonFiles = ['./data/naturereserve.geojson', './data/fire.geojson', './data/zones.geojson'];

var map = L.map('map', { zoomControl: false }).setView([57.621816, 14.925924], 17);

// map.createPane('labels');
// map.getPane('labels').style.zIndex = 650; // This pane is above markers but below popups
// map.getPane('labels').style.pointerEvents = 'none'; // Layers in this pane are non-interactive and do not obscure mouse/touch events

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
    sheetdata = resp.values;
    
    fetch('./data/campclusters.geojson').then(response => response.json()).then(response => 
    {
        L.geoJson(response, {style: function(feature) 
        {
            let color = 'gray';

            //loop thourgh sheetdata
            for (let i = 0; i < sheetdata.length; i++)
            {
                if (sheetdata[i][0] == feature.properties.name)
                {
                    if (sheetdata[i][1] > 490) color = 'red';
                    else if (sheetdata[i][1] > 250) color = 'orange';
                    else if (sheetdata[i][1] > 1) color = 'green';
                    else color = 'gray';
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
                "weight": 3,
                "opacity": 1,
                "fillOpacity": 0.1
            };
        }, onEachFeature: matchClusterData} )
        .addTo(map)
        .eachLayer(function (layer) {layer.bindPopup(layer.feature.properties.name)});
    });

});

// L.geoJSON(states, {
//     style: function(feature) {
//         switch (feature.properties.party) {
//             case 'Republican': return {color: "#ff0000"};
//             case 'Democrat':   return {color: "#0000ff"};
//         }
//     }
// }).addTo(map);

function matchClusterData(feature, layer) 
{
    // console.log(feature.properties.name);
}

// fetch('./data/campclusters.geojson').then(response => response.json()).then(response => 
// {
//     L.geoJson(response, {style: getStyle(response.name), onEachFeature: matchClusterData} ).addTo(map)
//     .eachLayer(function (layer) {layer.bindPopup(layer.feature.properties.name)
//     //  .bindTooltip(layer.feature.properties.name);
// });
// });

//loop through geojsonfiles, use fetch to download them and add as a layer to the map
for (var i = 0; i < geojsonFiles.length; i++) 
{
    fetch(geojsonFiles[i]).then(response => response.json()).then(response => 
    {
        L.geoJson(response, {style: getStyle(response.name), onEachFeature: onEachFeature} ).addTo(map)
        .eachLayer(function (layer) {layer.bindPopup(layer.feature.properties.name)
        //  .bindTooltip(layer.feature.properties.name);
	});
    });
}





    // var options = { 
    //   corridor: 5,
    //   className: 'route-corridor'
    // };

	// //Loop through fire features and add a corridor for all coordinates
	// for (var i = 0; i < fire.features.length; i++) {
	// 	// console.log(fire.features[i].type + i);
	// 	var coordinates = fire.features[i].geometry.coordinates;
	// 	map.addLayer(L.corridor(coordinates, options));
	// }

var tiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 20,
    attribution: 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    // id: 'mapbox/streets-v11',
    id: 'mapbox/satellite-v9',
    tileSize: 512,
    zoomOffset: -1
}).addTo(map);
