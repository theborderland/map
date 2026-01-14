import {
    MAX_CLUSTER_SIZE
} from '../../../SETTINGS';
import { Rule } from '../index';
import { calculatedAreaNeeded } from '../../utils';

export const isCalculatedAreaTooBig = () => new Rule(
    3,
    'Too many ppl/vehicles!',
    'Calculated area need is bigger than the maximum allowed area size! Make another area to fix this.',
    (entity) => {
        let areaNeeded = calculatedAreaNeeded(
            entity.nrOfPeople,
            entity.nrOfVehicles,
            entity.additionalSqm
        );
        return { triggered: areaNeeded > MAX_CLUSTER_SIZE };
    }
);
