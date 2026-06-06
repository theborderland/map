import {
    MAX_POINTS_BEFORE_WARNING
} from '../../../SETTINGS';
import { Rule } from '../index';

export const hasManyCoordinates = () => new Rule(
    1,
    'Many points.',
    'You have added many points to this shape. Bear in mind that you will have to set this shape up in reality as well.',
    (entity) => {
        const geoJson = entity.toGeoJSON();
        //Dont know why I have to use [0] here, but it works
        return { triggered: geoJson.geometry.coordinates[0].length > MAX_POINTS_BEFORE_WARNING };
    }
);
