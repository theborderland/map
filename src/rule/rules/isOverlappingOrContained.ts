import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';
import { MapEntity } from '../../entities';
import {
    getPolygonFeatureFromLayer,
    hasSignificantPolygonOverlap,
    campOverlapsClearanceZone,
} from './utils';

export const isOverlappingOrContained = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string,
    skipFor: (entity: MapEntity) => boolean = () => false,
    options: { clearanceZone?: boolean } = {},
) =>
    new Rule(severity, shortMsg, message, (entity) => {
        if (skipFor(entity)) {
            return { triggered: false };
        }

        const campFeature = entity.toGeoJSON();
        if (!campFeature?.geometry || campFeature.geometry.type !== 'Polygon') {
            return { triggered: false };
        }

        let overlap = false;

        layerGroup?.eachLayer((layer) => {
            if (overlap) {
                return;
            }

            const zoneFeature = getPolygonFeatureFromLayer(layer);
            if (!zoneFeature) {
                return;
            }

            if (options.clearanceZone) {
                if (campOverlapsClearanceZone(campFeature, zoneFeature)) {
                    overlap = true;
                }
            } else if (hasSignificantPolygonOverlap(campFeature, zoneFeature)) {
                overlap = true;
            }
        });

        return { triggered: overlap };
    });
