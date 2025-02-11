import {
    MAX_CLUSTER_SIZE
} from '../../../SETTINGS';
import { Rule } from '../index';

export const isBiggerThanNeeded = () => new Rule(
    2,
    'Bigger than needed?',
    'Your area is quite big for the amount of people/vehicles and extras you have typed in.',
    (entity) => {
        return {
            triggered: entity.area > _calculateReasonableArea(entity.calculatedAreaNeeded),
            message: `Your area is <b>${entity.area - entity.calculatedAreaNeeded}m² bigger</b> than the suggested area size. Consider making it smaller.`,
        };
    }
);

function _calculateReasonableArea(calculatedNeed: number): number {
    // Define constants for the power function
    const a = 0.5; // Controls the initial additional area
    const b = -0.2; // Controls the rate of decrease of the additional area

    // Calculate the additional area percentage using a power function
    const additionalArea = a * Math.pow(calculatedNeed, b);

    // Clamp the additional area between 0 and a
    const clampedAdditionalArea = Math.max(0, Math.min(additionalArea, a));

    // Calculate the allowed area
    const allowedArea = Math.min(calculatedNeed * (1 + clampedAdditionalArea), MAX_CLUSTER_SIZE);

    return allowedArea;
}
