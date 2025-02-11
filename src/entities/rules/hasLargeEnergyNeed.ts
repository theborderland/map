import {
    MAX_POWER_NEED
} from '../../../SETTINGS';
import { Rule } from '../rule';

export const hasLargeEnergyNeed = () => new Rule(1, 'Powerful.', 'You need a lot of power, make sure its not a typo.', (entity) => {
    return { triggered: entity.powerNeed > MAX_POWER_NEED };
});
