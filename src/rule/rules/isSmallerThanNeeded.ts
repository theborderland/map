import { Rule } from '../index';

export const isSmallerThanNeeded = () => new Rule(
    1,
    'Too small.',
    'Considering the amount of people, vehicles and extras you have, this area is probably too small.',
    (entity) => {
        let calculatedNeed = entity.calculatedAreaNeeded;
        if (entity.area < calculatedNeed) {
            return {
                triggered: true,
                shortMessage: 'Too small.',
                message: `Considering the amount of people, vehicles and extras you have, this area is probably too small. Consider adding at least ${Math.ceil(
                    calculatedNeed - entity.area
                )}m² more.`,
            };
        } else {
            return { triggered: false };
        }
    }
);
