const iconsSize = 48;
const iconAnchor = iconsSize * 0.5;

var centeredIcon = L.Icon.extend({
    options: {
        iconSize:     [iconsSize, iconsSize],
        iconAnchor:   [iconAnchor,iconAnchor],
        popupAnchor:  [0,-iconsSize*0.25]
    }
});

var sleep = duration => new Promise(resolve => setTimeout(resolve, duration))
var poll = (promiseFn, duration) => promiseFn().then(
             sleep(duration).then(() => poll(promiseFn, duration)))

// var trackers = {};

export const startTracking = async (map) => 
{
    // poll(() => new Promise(() => pollServer(map)), 10000)
    try 
    {
        const response = await fetch('https://soffan.freaks.se/trackers/');
        const data = await response.json();

        for (var key in data) 
        {
            let lastTimeStamp = new Date(data[key].timeStamp);
            let isUpdatedWithinTheLast24Hours = (new Date() - lastTimeStamp) < 60 * 60 * 24 * 1000;

            if (isUpdatedWithinTheLast24Hours) 
            {

                        let icon = "placemark";
                        if (key == "slowfa") icon = "slowfa";
        
                        const clock = lastTimeStamp.getHours() + ":" + lastTimeStamp.getMinutes();
        
                        const content = '<h1>' + key + '</h1>' + '<p>' + '<b>Last seen:</b> ' + clock + '</p>';
        
                        L.marker([data[key].lat, data[key].long], {icon: new centeredIcon({iconUrl: './img/icons/' + icon + '.png'})})
                        .addTo(map)
                        .bindPopup(content);
            }
        }
    } 
    catch (error) 
    {
        console.log(error);
    }
}

// async function pollServer(map)
// {
//     try 
//     {
//         const response = await fetch('https://localhost:7103/trackers/');
//         const data = await response.json();

//         for (var key in data) 
//         {
//             if (key in trackers)
//             {
//                 trackers[key].setLatLng(new L.LatLng(data[key].lat, data[key].long));
//             }
//             else
//             {
//                 const content = '<h3>' + data[key].trackerid + '</h3>' + '<p>' + data[key].timestamp + '</p>';
//                 trackers[key] = L.marker([data[key].lat, data[key].long], {icon: new centeredIcon({iconUrl: './img/icons/' + "water" + '.png'})})
//                 .addTo(map)
//                 .bindPopup(content);
//             }
//         }
//     } 
//     catch (error) 
//     {
//         console.log(error);
//     }
// }