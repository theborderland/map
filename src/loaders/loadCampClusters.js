import { CAMP_CAMPS_SPREADSHEET_JSON, CAMP_CLUSTERS_GEOJSON, CAMP_CLUSTERS_SPREADSHEET_JSON } from '../constants';
import L from 'leaflet';
import { loadSpreadSheet } from '../utils/loadSpreadSheet';
import { loadGeoJson } from '../utils/loadGeoJson';

const loadAreaCamps = async () => {
    let areas = {};
      
    const sheetdata = await loadSpreadSheet(CAMP_CAMPS_SPREADSHEET_JSON);

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
                    areas[row_segment_name].power_usage = 0;
                    areas[row_segment_name].camps = {};
                }
                else if (row_segment_counter == 1)
                {
                    // Extract size
                    if (parseInt(row[1]))
                    {
                        areas[row_segment_name].size = parseInt(row[1]);
                    }
                }
                else if (row_segment_counter == 2)
                {
                    // Extract reserved size
                    if (parseInt(row[1]))
                    {
                        areas[row_segment_name].size_reserved = parseInt(row[1]);
                    }
                }
                else if (row_segment_counter == 3)
                {
                    // Extract ussage of area in percent
                    if (parseInt(row[1]))
                    {
                        areas[row_segment_name].size_usage_percent = parseInt(row[1]);
                    }
                }
                else if (row_segment_counter == 4)
                {
                    // Extract power usage
                    if (parseInt(row[1]))
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
                        if ((row[2]?.length > 0) || (row[3]?.length > 0))
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
                            areas[row_segment_name].camps[extracted_name] = {};
                            areas[row_segment_name].camps[extracted_name].type = extracted_type;
                            areas[row_segment_name].camps[extracted_name].name = extracted_name;
                            areas[row_segment_name].camps[extracted_name].projects = "";
                            areas[row_segment_name].camps[extracted_name].number_of_people = 0;
                            areas[row_segment_name].camps[extracted_name].number_of_vans = 0;
                            areas[row_segment_name].camps[extracted_name].other_structure_m2 = 0;
                            areas[row_segment_name].camps[extracted_name].power_usage = 0;
                            areas[row_segment_name].camps[extracted_name].contact_person = "";
                            areas[row_segment_name].camps[extracted_name].contact_contact = "";
                            areas[row_segment_name].camps[extracted_name].lnt_person = "";
                            areas[row_segment_name].camps[extracted_name].lnt_contact = "";
                            areas[row_segment_name].camps[extracted_name].consent_person = "";
                            areas[row_segment_name].camps[extracted_name].consent_contact = "";
                            areas[row_segment_name].camps[extracted_name].comment = "";
                            areas[row_segment_name].camps[extracted_name].spreadRow = i;

                            for (let col_i = 0; col_i < row.length; col_i++)
                            {
                                if (col_i == 3)
                                {
                                    areas[row_segment_name].camps[extracted_name].projects = row[col_i];
                                }
                                else if (col_i == 4)
                                {
                                    if (parseInt(row[col_i]))
                                    {
                                        areas[row_segment_name].camps[extracted_name].number_of_people = parseInt(row[col_i]);
                                    }
                                }
                                else if (col_i == 5)
                                {
                                    if (parseInt(row[col_i]))
                                    {
                                        areas[row_segment_name].camps[extracted_name].number_of_vans = parseInt(row[col_i]);
                                    }
                                }
                                else if (col_i == 6)
                                {
                                    if (parseInt(row[col_i]))
                                    {
                                        areas[row_segment_name].camps[extracted_name].other_structure_m2 = parseInt(row[col_i]);
                                    }
                                }
                                else if (col_i == 7)
                                {
                                    if (parseInt(row[col_i]))
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
                        }
                    }
                }
            }

        }    
    }
    // console.log(areas);
    return areas;
};

export const loadCampClusters = async (map) => {
    const areas_w_camps = await loadAreaCamps();
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
                        feature.properties.camps = areas_w_camps[feature.properties.sheetname].camps;
                        feature.properties.maxarea = areas_w_camps[feature.properties.sheetname].size;
                        feature.properties.reservedarea = areas_w_camps[feature.properties.sheetname].size_reserved;
                        feature.properties.description = areas_w_camps[feature.properties.sheetname].comment;
                        feature.properties.size_usage_percent = areas_w_camps[feature.properties.sheetname].size_usage_percent;
                        feature.properties.spreadRowStart = areas_w_camps[feature.properties.sheetname].spreadRowStart;
                        feature.properties.spreadRowEnd = areas_w_camps[feature.properties.sheetname].spreadRowEnd;
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
                        // Hide tooltip when zooming in close to area, but only if any camps is there to be shown
                        if (Object.keys(feature.properties.camps).length > 0)
                        {
                            if (feature.properties.type == 'camp') feature.properties.maxzoom = 18;
                            if (feature.properties.type == 'art') feature.properties.maxzoom = 18;
                            if (feature.properties.type == 'sound') feature.properties.maxzoom = 18;
                            if (feature.properties.type == 'building') feature.properties.maxzoom = 18;
                        }
                    }

                    // Set at which zoom-level the tooltip should dissappear
                    if (feature.properties.type == 'camp') feature.properties.minzoom = 17;
                    if (feature.properties.type == 'art') feature.properties.minzoom = 17;
                    if (feature.properties.type == 'parking') feature.properties.minzoom = 17;
                    if (feature.properties.type == 'building') feature.properties.minzoom = 17;
                    if (feature.properties.type == 'sound') feature.properties.minzoom = 17;
                    if (feature.properties.type == 'bridge') feature.properties.minzoom = 17;
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
        onEachFeature: (feature, layer) => {
            let span = "<span style='color: white; text-shadow: 2px 2px #000000; font-weight: bold'>" + feature.properties.sheetname + '</span>';
            layer.bindTooltip(
                span,
                { permanent: true, direction: 'center' },
            );
        },
    }));

    data.addTo(map).eachLayer((layer) => {
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
            preferredType += 'Art projects is preferred over camps.';
        }
        else if (layer.feature.properties.type === 'camp')
        {
            preferredType += '<span style=\'color:#03d7fc\'>■</span> ';
            preferredType += 'Fitting camp sites.';
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
            preferredType += 'No recommendations.';
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
                        camps +=     "</li>";
                        camps +=     "<li>";
                        camps +=       "Vans: "+camp.number_of_vans;
                        camps +=     "</li>";
                    }
                    camps +=     "<li>";
                    camps +=       "Other structure: "+camp.other_structure_m2+"m²";
                    camps +=     "</li>";
                    camps +=     "<li>";
                    camps +=       "Power: "+camp.power_usage+" W";
                    camps +=     "</li>";
                    camps +=   "</ul>";
                    camps += "</li>";
                }
                camps += "</ul>";
            }
        }

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
        placement += '">Placement Spreadsheet</a>';

        const content = '<h2>' + name + '</h2>' + area + notice + preferredType + description + camps + placement;

        layer.bindPopup(content);
        layer.bringToFront();
    });
};
