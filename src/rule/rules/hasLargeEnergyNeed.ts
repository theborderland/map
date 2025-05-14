import {
    MAX_POWER_NEED
} from '../../../SETTINGS';
import { Rule } from '../index';

export const hasLargeEnergyNeed = () => new Rule(1, 'Powerful.', 'You need a lot of power, make sure it\'s not a typo.', (entity) => {
    return { triggered: entity.powerNeed > MAX_POWER_NEED };
});
