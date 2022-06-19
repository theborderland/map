import { CAMP_CAMPS_SPREADSHEET_JSON, CAMP_CLUSTERS_GEOJSON, CAMP_CLUSTERS_SPREADSHEET_JSON } from '../constants';
import L from 'leaflet';
import { loadSpreadSheet } from '../utils/loadSpreadSheet';
import { loadGeoJson } from '../utils/loadGeoJson';

const loadAreaCamps = async () => {
    let areas = {};
      
    const sheetdata = await loadSpreadSheet(CAMP_CAMPS_SPREADSHEET_JSON);

    let zone_name = "";
    let row_segment_type = "";
    let row_segment_counter = 0;
    let row_segment_name = "";
    const offset = 3;

    // Loop through sheetdata and group them by area
    for (let i = 0; i < sheetdata.length; i++)
    {
        let row = sheetdata[i];
        // Analyze non empty rows
        if (row.length > 0)
        {
            // If first col is empty it's a continuation of previous area or zone
            if (row[0] == '')
            {
                row_segment_counter += 1;
            }
            else
            {
                // It's a new area or zone
                // console.log(areas[row_segment_name]);
                row_segment_counter = 0;
                row_segment_type = row[0];
            }
            // Extract data
            if (row_segment_type == 'camp' || row_segment_type == 'art' || row_segment_type == 'sound' || row_segment_type == 'building')
            {
                // Extract area information
                if (row_segment_counter == 0)
                {
                    // Init cluster area
                    row_segment_name = row[1];
                    areas[row_segment_name] = {};
                    areas[row_segment_name].name = row_segment_name;
                    areas[row_segment_name].type = "";
                    areas[row_segment_name].size = 0;
                    areas[row_segment_name].size_reserved = 0;
                    areas[row_segment_name].size_usage_percent = "";
                    areas[row_segment_name].zone = zone_name;
                    areas[row_segment_name].camps = {};
                }
                else if (row_segment_counter == 1)
                {
                    // Extract size
                    if (parseInt(row[1]) >= 0)
                    {
                        areas[row_segment_name].size = parseInt(row[1]);
                    }
                }
                else if (row_segment_counter == 2)
                {
                    // Extract reserved size
                    if (parseInt(row[1]) >= 0)
                    {
                        areas[row_segment_name].size_reserved = parseInt(row[1]);
                    }
                }
                else if (row_segment_counter == 3)
                {
                    // Extract ussage of area in percent
                    if (parseInt(row[1]) >= 0)
                    {
                        areas[row_segment_name].size_usage_percent = parseInt(row[1]);
                    }
                }
                else if (row_segment_counter == 4)
                {
                    // Extract power usage
                    if (parseInt(row[1]) >= 0)
                    {
                        areas[row_segment_name].power_usage = parseInt(row[1]);
                    }
                }
                // Set spreadsheet row
                if (row_segment_counter == 0)
                {
                    areas[row_segment_name].spreadRowStart = i + offset;
                    areas[row_segment_name].spreadRowEnd = i + offset;
                } else
                {
                    areas[row_segment_name].spreadRowEnd = i + offset;
                }
                // Extract camp or project information
                if (row.length >= 2)
                {
                    // It's considored a camp/project if we have at least a name, column number 2 (camp) 3 (project)
                    if (row.length >= 2)
                    {
                        if ((row[2]?.length > 0) || (row[3]?.length > 0) || (row[4]?.length > 0) || (row[5]?.length > 0) || (row[6]?.length > 0))
                        {
                            // Init camp
                            let extracted_name = "";
                            let extracted_type = "";
                            if (row[2]?.length > 0)
                            {
                                // Camp name
                                extracted_name = row[2];
                                extracted_type = "camp";
                            }
                            else if (row[3]?.length > 0)
                            {
                                // Project name
                                extracted_name = row[3];
                                extracted_type = "project";
                            }
                            else
                            {
                                extracted_name = "unnamed";
                                extracted_type = "unknown";
                            }
                            areas[row_segment_name].camps[extracted_name] = {};
                            areas[row_segment_name].camps[extracted_name].type = extracted_type;
                            areas[row_segment_name].camps[extracted_name].name = extracted_name;
                            areas[row_segment_name].camps[extracted_name].name_unique = row_segment_name+"_"+extracted_name+"_"+i;
                            areas[row_segment_name].camps[extracted_name].projects = "";
                            areas[row_segment_name].camps[extracted_name].number_of_people = 0;
                            areas[row_segment_name].camps[extracted_name].number_of_vans = 0;
                            areas[row_segment_name].camps[extracted_name].other_structure_m2 = 0;
                            areas[row_segment_name].camps[extracted_name].power_usage = NaN;
                            areas[row_segment_name].camps[extracted_name].contact_person = "";
                            areas[row_segment_name].camps[extracted_name].contact_contact = "";
                            areas[row_segment_name].camps[extracted_name].lnt_person = "";
                            areas[row_segment_name].camps[extracted_name].lnt_contact = "";
                            areas[row_segment_name].camps[extracted_name].consent_person = "";
                            areas[row_segment_name].camps[extracted_name].consent_contact = "";
                            areas[row_segment_name].camps[extracted_name].comment = "";
                            areas[row_segment_name].camps[extracted_name].zone = zone_name;
                            areas[row_segment_name].camps[extracted_name].cluster = row_segment_name;
                            areas[row_segment_name].camps[extracted_name].spreadRow = i;

                            for (let col_i = 0; col_i < row.length; col_i++)
                            {
                                if (col_i == 3)
                                {
                                    areas[row_segment_name].camps[extracted_name].projects = row[col_i];
                                }
                                else if (col_i == 4)
                                {
                                    if (parseInt(row[col_i]) >= 0)
                                    {
                                        areas[row_segment_name].camps[extracted_name].number_of_people = parseInt(row[col_i]);
                                    }
                                }
                                else if (col_i == 5)
                                {
                                    if (parseInt(row[col_i]) >= 0)
                                    {
                                        areas[row_segment_name].camps[extracted_name].number_of_vans = parseInt(row[col_i]);
                                    }
                                }
                                else if (col_i == 6)
                                {
                                    if (parseInt(row[col_i]) >= 0)
                                    {
                                        areas[row_segment_name].camps[extracted_name].other_structure_m2 = parseInt(row[col_i]);
                                    }
                                }
                                else if (col_i == 7)
                                {
                                    if (parseInt(row[col_i]) >= 0)
                                    {
                                        areas[row_segment_name].camps[extracted_name].power_usage = parseInt(row[col_i]);
                                    }
                                }
                                else if (col_i == 8)
                                {
                                    areas[row_segment_name].camps[extracted_name].contact_person = row[col_i];
                                }
                                else if (col_i == 9)
                                {
                                    areas[row_segment_name].camps[extracted_name].contact_contact = row[col_i];
                                }
                                else if (col_i == 10)
                                {
                                    areas[row_segment_name].camps[extracted_name].lnt_person = row[col_i];
                                }
                                else if (col_i == 11)
                                {
                                    areas[row_segment_name].camps[extracted_name].lnt_contact = row[col_i];
                                }
                                else if (col_i == 12)
                                {
                                    areas[row_segment_name].camps[extracted_name].consent_person = row[col_i];
                                }
                                else if (col_i == 13)
                                {
                                    areas[row_segment_name].camps[extracted_name].consent_contact = row[col_i];
                                }
                                else if (col_i == 14)
                                {
                                    areas[row_segment_name].camps[extracted_name].comment = row[col_i];
                                }
                            }
                            /*
                            console.log(areas[row_segment_name].name,
                                areas[row_segment_name].power_usage,
                                extracted_name,
                                areas[row_segment_name].camps[extracted_name].power_usage);
                            */
                        }
                    }
                }
            }
            else if (row_segment_counter == 0 && row_segment_type == 'Zone')
            {
                if (row.length >= 2)
                {
                    if (row[2]?.length > 0)
                    {
                        zone_name = row[2];
                        // console.log(row_segment_type, zone_name);
                    }
                }
            }
        }    
    }
    // console.log(areas);
    return areas;
};

const calcSortAvrage = async (statistics) => {
    // Sumurize
    for (var i in statistics.values)
    {
        statistics.valuesOrdered.push(statistics.values[i]);
        statistics.total += statistics.values[i].power_usage;
    }
    // Sort
    if (statistics.valuesOrdered.length > 1)
    {
        statistics.valuesOrdered.sort((a, b) => (a.power_usage > b.power_usage) ? 1 : -1)
    }
    // Get lowest and highest
    if (statistics.valuesOrdered.length > 0)
    {
        statistics.lowest = Math.min.apply(Math, statistics.valuesOrdered.map(function(o) { 
            return o.power_usage; }));
        statistics.highest = Math.max.apply(Math, statistics.valuesOrdered.map(function(o) { 
            return o.power_usage; }));
    }
    // Calculate median
    if (statistics.valuesOrdered.length > 0)
    {
        statistics.median = statistics.valuesOrdered[Math.floor(statistics.valuesOrdered.length/2)].power_usage;
    }
    // Calculate median
    if (statistics.valuesOrdered.length > 0)
    {
        const findAverageAge = (arr) => {
            const { length } = arr;
            return arr.reduce((acc, val) => {
               return acc + (val.power_usage/length);
            }, 0);
        };
        statistics.avrage = findAverageAge(statistics.valuesOrdered);
        statistics.avrage = Math.round(statistics.avrage);
    }
    statistics.number = statistics.valuesOrdered.length;
    // console.log(statistics);
}

const calcPowerUsage = async (map, areas_w_camps) => {
    // Calculate power usage in dicts powerUsage.zones[].cluster[].camps[]

    // Init
    let powerUsage = {};
    powerUsage.zones = {};
    powerUsage.statistics = {};
    powerUsage.statistics.values = {};
    powerUsage.statistics.valuesOrdered = [];

    // Go through clusters and create zones
    for (var i_cluster in areas_w_camps)
	{
        let zone = areas_w_camps[i_cluster].zone;
        let cluster = areas_w_camps[i_cluster].name;
        // console.log(zone, i_cluster);
        // Init zone
        if (!powerUsage.zones.hasOwnProperty(zone))
        {
            powerUsage.zones[zone] = {};
            powerUsage.zones[zone].statistics = {};
            powerUsage.zones[zone].statistics.values = {};
            powerUsage.zones[zone].statistics.valuesOrdered = [];
            powerUsage.zones[zone].statistics.total = 0;
            powerUsage.zones[zone].statistics.lowest = 0;
            powerUsage.zones[zone].statistics.highest = 0;
            powerUsage.zones[zone].statistics.median = 0;
            powerUsage.zones[zone].statistics.avrage = 0;
            powerUsage.zones[zone].statistics.number = 0;
            powerUsage.zones[zone].flags = {};
            powerUsage.zones[zone].flags.not_given = false;
            powerUsage.zones[zone].flags.zero = false;
            powerUsage.zones[zone].flags.using_power = false;
            powerUsage.zones[zone].clusters = {};
            powerUsage.zones[zone].name = zone;
        }
        // Init cluster
        powerUsage.zones[zone].clusters[cluster] = {};
        powerUsage.zones[zone].clusters[cluster].statistics = {};
        powerUsage.zones[zone].clusters[cluster].statistics.values = {};
        powerUsage.zones[zone].clusters[cluster].statistics.valuesOrdered = [];
        powerUsage.zones[zone].clusters[cluster].statistics.total = 0;
        powerUsage.zones[zone].clusters[cluster].statistics.lowest = 0;
        powerUsage.zones[zone].clusters[cluster].statistics.highest = 0;
        powerUsage.zones[zone].clusters[cluster].statistics.median = 0;
        powerUsage.zones[zone].clusters[cluster].statistics.avrage = 0;
        powerUsage.zones[zone].clusters[cluster].statistics.number = 0;
        powerUsage.zones[zone].clusters[cluster].flags = {};
        powerUsage.zones[zone].clusters[cluster].flags.not_given = false;
        powerUsage.zones[zone].clusters[cluster].flags.zero = false;
        powerUsage.zones[zone].clusters[cluster].flags.using_power = false;
        powerUsage.zones[zone].clusters[cluster].camps = {};
        powerUsage.zones[zone].clusters[cluster].cluster_details = areas_w_camps[i_cluster];
        powerUsage.zones[zone].clusters[cluster].name = zone;
        // Got through camps in cluster and add values
        for (var i_camp in areas_w_camps[i_cluster].camps)
        {
            let camp = areas_w_camps[i_cluster].camps[i_camp].name_unique;
            // console.log(camp, areas_w_camps[i_cluster].camps[i_camp])
            // Init camp
            powerUsage.zones[zone].clusters[cluster].camps[camp] = {};
            powerUsage.zones[zone].clusters[cluster].camps[camp].flags = {};
            powerUsage.zones[zone].clusters[cluster].camps[camp].flags.not_given = false;
            powerUsage.zones[zone].clusters[cluster].camps[camp].flags.zero = false;
            powerUsage.zones[zone].clusters[cluster].camps[camp].flags.using_power = false;
            powerUsage.zones[zone].clusters[cluster].camps[camp].camp_details = areas_w_camps[i_cluster].camps[i_camp];
            powerUsage.zones[zone].clusters[cluster].camps[camp].name = camp;
            // Check power level
            let power = areas_w_camps[i_cluster].camps[i_camp].power_usage;
            powerUsage.zones[zone].clusters[cluster].camps[camp].total = power;
            if (isNaN(power))
            {
                powerUsage.zones[zone].clusters[cluster].camps[camp].flags.not_given = true;
            }
            else if (power == 0)
            {
                powerUsage.zones[zone].clusters[cluster].camps[camp].flags.zero = true;
            }
            else
            {
                powerUsage.zones[zone].clusters[cluster].camps[camp].flags.using_power = true;
            }
            // Add power level, maybe not count zero-power here???
            if (powerUsage.zones[zone].clusters[cluster].camps[camp].flags.using_power || 
                powerUsage.zones[zone].clusters[cluster].camps[camp].flags.zero)
            {
                powerUsage.zones[zone].clusters[cluster].statistics.values[camp] = areas_w_camps[i_cluster].camps[i_camp];
                powerUsage.zones[zone].statistics.values[camp] = areas_w_camps[i_cluster].camps[i_camp];
                powerUsage.statistics.values[camp] = areas_w_camps[i_cluster].camps[i_camp];
            }
            // Escalate flags
            if (powerUsage.zones[zone].clusters[cluster].camps[camp].flags.using_power)
            {
                powerUsage.zones[zone].clusters[cluster].flags.using_power = true;
                powerUsage.zones[zone].flags.using_power = true;
            }
            if (powerUsage.zones[zone].clusters[cluster].camps[camp].flags.zero)
            {
                powerUsage.zones[zone].clusters[cluster].flags.zero = true;
                powerUsage.zones[zone].flags.zero = true;
            }
            if (powerUsage.zones[zone].clusters[cluster].camps[camp].flags.not_given)
            {
                powerUsage.zones[zone].clusters[cluster].flags.not_given = true;
                powerUsage.zones[zone].flags.not_given = true;
            }
        }
    }

    // Calculate statistics
    for (var zone in powerUsage.zones)
	{
        // console.log(powerUsage.zones[zone]);
        for (var cluster in powerUsage.zones[zone].clusters)
        {
            // // console.log(powerUsage.zones[zone].clusters[cluster]);
            // let itemss = powerUsage.zones[zone].clusters[cluster].statistics.values.keys(dict).map(function(key) {
            //     return [key, dict[key]];
            // });

            // let items = list(powerUsage.zones[zone].clusters[cluster].statistics.values.items());
            //console.log(powerUsage.zones[zone].clusters[cluster].statistics.values);
            //let items = Object.entries(list(powerUsage.zones[zone].clusters[cluster].statistics.values).sort((a,b) => b[1].power_usage-a[1].power_usage);
            await calcSortAvrage(powerUsage.zones[zone].clusters[cluster].statistics);
        }
        await calcSortAvrage(powerUsage.zones[zone].statistics);
    }
    // Calculate the global
    powerUsage.statistics.total = 0;
    powerUsage.statistics.lowest = 0;
    powerUsage.statistics.highest = 0;
    powerUsage.statistics.median = 0;
    powerUsage.statistics.avrage = 0;
    powerUsage.statistics.number = 0;
    await calcSortAvrage(powerUsage.statistics);
    // Calculate values, the lower and upper third should do
    powerUsage.statistics.limit_low = powerUsage.statistics.valuesOrdered[Math.floor(powerUsage.statistics.valuesOrdered.length*0.33)].power_usage;
    powerUsage.statistics.limit_high = powerUsage.statistics.valuesOrdered[Math.floor(powerUsage.statistics.valuesOrdered.length*0.67)].power_usage;

    return powerUsage;
}

export const loadCampClusters = async (map) => {
	let group = new L.LayerGroup();
    const areas_w_camps = await loadAreaCamps();
    map.powerUsage = await calcPowerUsage(map, areas_w_camps);
    const sheetdata = await loadSpreadSheet(CAMP_CLUSTERS_SPREADSHEET_JSON);

    const data = await loadGeoJson(CAMP_CLUSTERS_GEOJSON, () => ({
        style: function (feature) {
            let color = '#03d7fc';
            let fillOpacity = 0.0;

            // Loop through sheetdata and add it to each feature
            for (let i = 0; i < sheetdata.length; i++) {
                const [id, type, sheetname, maxarea, reservedarea, notice, description] = sheetdata[i];

                // Convert to string
                if (id === '' + feature.properties.fid) {
                    feature.properties = {
                        ...feature.properties,
                        sheetname,
                        maxarea,
                        reservedarea,
                        notice,
                        description,
                    };

                    if (type === 'art') color = 'purple';
                    else if (type === 'camp') color = '#03d7fc';
                    else if (type === 'parking') color = 'grey';
                    else if (type === 'sound') color = 'blue';
                    else if (type === 'bridge') color = 'yellow';
                    else if (type === 'building') color = 'brown';

                    feature.properties.type = type;

                    // If area ahs clusters loaded in areas_w_camps, check size-usage
                    if (feature.properties.sheetname in areas_w_camps)
                    {
                        // console.log(feature.properties.sheetname + " is in areas_w_camps");
                        feature.properties.name = sheetname;
                        feature.properties.camps = areas_w_camps[feature.properties.sheetname].camps;
                        feature.properties.maxarea = areas_w_camps[feature.properties.sheetname].size;
                        feature.properties.reservedarea = areas_w_camps[feature.properties.sheetname].size_reserved;
                        feature.properties.description = areas_w_camps[feature.properties.sheetname].comment;
                        feature.properties.size_usage_percent = areas_w_camps[feature.properties.sheetname].size_usage_percent;
                        feature.properties.spreadRowStart = areas_w_camps[feature.properties.sheetname].spreadRowStart;
                        feature.properties.spreadRowEnd = areas_w_camps[feature.properties.sheetname].spreadRowEnd;
                        feature.properties.zone = areas_w_camps[feature.properties.sheetname].zone;
                        // If full, set color of area
                        if (feature.properties.size_usage_percent > 110)
                        {
                            color = 'red';
                            fillOpacity = 0.5;
                        }
                        else
                        {
                            fillOpacity = (feature.properties.reservedarea / feature.properties.maxarea) * 0.75;
                        }
                    }
                    break;
                }
            }

            return {
                color: color,
                fillColor: color,
                weight: 2,
                opacity: 0.5,
                fillOpacity: fillOpacity,
            };
        },
    }));

    data.addTo(group).eachLayer((layer) => {
        let name = '';
        if (layer.feature.properties.sheetname)
        {
            name = layer.feature.properties.sheetname;
        }
        else
        {
            name = layer.feature.properties.fid;
        }

        let area = '';
        if (layer.feature.properties?.reservedarea == 0 || layer.feature.properties?.reservedarea > 0) {
            area += layer.feature.properties.reservedarea;
            area += ' m² reserved of ';
            area += layer.feature.properties.maxarea;
            area += ' m²';
            if (layer.feature.properties.size_usage_percent)
            {
                area += ' (';
                area += layer.feature.properties.size_usage_percent;
                area += '%).';
            }
            area += '<BR>';
        }

        let preferredType = '';
        preferredType += '<p>';
        preferredType += 'Placement recommendations:<br />';
        if (layer.feature.properties.type === 'art')
        {
            preferredType += '<span style=\'color:purple\'>■</span> ';
            preferredType += 'Public/Art projects is preferred over camps.';
        }
        else if (layer.feature.properties.type === 'camp')
        {
            preferredType += '<span style=\'color:#03d7fc\'>■</span> ';
            preferredType += 'Good for camp sites.';
        }
        else if (layer.feature.properties.type === 'parking')
        {
            preferredType += '<span style=\'color:grey\'>■</span> ';
            preferredType += 'Only parking allowed.';
        }
        else if (layer.feature.properties.type === 'sound')
        {
            preferredType += '<span style=\'color:blue\'>■</span> ';
            preferredType += 'For sound camps.';
        }
        else if (layer.feature.properties.type === 'bridge')
        {
            preferredType += '<span style=\'color:yellow\'>■</span> ';
            preferredType += 'Jacob builds supreme bridges.';
        }
        else if (layer.feature.properties.type === 'building')
        {
            preferredType += '<span style=\'color:brown\'>■</span> ';
            preferredType += 'Buildings are not for camping, only projects.';
        }
        preferredType += '</p>';

        let camps = '';
        // console.log(layer.feature.properties.camps);
        if (layer.feature.properties?.camps)
        {
            if (Object.keys(layer.feature.properties.camps).length > 0)
            {
                camps = '<h3>In this cluster:</h3><ul class="camps-list-popup">';
                for (const [key, camp] of Object.entries(layer.feature.properties.camps))
                {
                    // console.log(key, camp);
                    let percent = 0;
                    camps += "<li>";
                    camps += "["+camp.type+"] "+camp.name;
                    camps +=   "<ul>";
                    if (camp.type != "project")
                    {
                        if (camp.projects?.length > 0)
                        {
                            camps +=     "<li>";
                            camps +=       "Projects: "+camp.projects;
                            camps +=     "</li>";
                        }
                        camps +=     "<li>";
                        camps +=       "People: "+camp.number_of_people;
                        camps +=       ", Vans: "+camp.number_of_vans;
                        camps +=     "</li>";
                    }
                    camps +=     "<li>";
                    camps +=       "Other structure: "+camp.other_structure_m2+"m²";
                    camps +=     "</li>";
                    camps +=     "<li>";
                    camps +=       "Power: "+camp.power_usage+" W";
                    camps +=     "</li>";
                    if (camp.comment?.length > 0)
                    {
						let comment = camp.comment;
						if (comment.length > 50)
						{
							comment = comment.substring(0, 50) + "…";
						}
                        camps +=     "<li>";
                        camps +=       "Comment: " + comment;
                        camps +=     "</li>";
                        }
                    camps +=   "</ul>";
                    camps += "</li>";
                }
                camps += "</ul>";
            }
        }

        let camps_notice = '<p>';
        camps_notice += '<span style="font-style: italic">';
        camps_notice += "* The amount of people and vans will automatically be calculated to account for a certain square meters of the cluster.";
        camps_notice += "</span>";
        camps_notice += "</p>"

        let notice = '';
        if (layer.feature.properties.notice) notice = '<h3>' + layer.feature.properties.notice + '</h3>';

        let description = '';
        if (layer.feature.properties.description)
            description = '<B>Description:</B> ' + layer.feature.properties.description + '<BR>';

        let placement = '';
        placement += '<p><a href="';
        placement += "https://docs.google.com/spreadsheets/d/1GUOHOdrUGk9SsBeE83Z1wadbmqqG-_OKN2VT2jKVB7A/edit#gid=1635664864&range=";
        // Add range like "471:476";
        placement += layer.feature.properties.spreadRowStart + ":" + layer.feature.properties.spreadRowEnd;
        placement += '">';
        placement += name + ' on ';
        placement += 'Placement Spreadsheet';
        placement += '</a>';

        const content = '<h2>' + name + '</h2>' + area + notice + preferredType + description + camps + camps_notice + placement;

        layer.bindPopup(content);
        layer.bringToFront(); //To make sure the camp overlay is alway above the zones. Might be better to solve this with panes though.
    });
    // console.log(map);
    return group;
};
