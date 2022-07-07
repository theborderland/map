const iconsSize = 48;
const iconAnchor = iconsSize * 0.5;

var centeredIcon = L.Icon.extend({
    options: {
        iconSize:     [iconsSize, iconsSize],
        iconAnchor:   [iconAnchor,iconAnchor],
        popupAnchor:  [0,-iconsSize*0.25]
    }
});

export const startTracking = async (map) => 
{
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