import {
    MAX_CLUSTER_SIZE
} from '../../../SETTINGS';
import { Rule } from '../index';

export const isCalculatedAreaTooBig = () => new Rule(
    3,
    'Too many ppl/vehicles!',
    'Calculated area need is bigger than the maximum allowed area size! Make another area to fix this.',
    (entity) => {
        return { triggered: entity.calculatedAreaNeeded > MAX_CLUSTER_SIZE };
    }
);
