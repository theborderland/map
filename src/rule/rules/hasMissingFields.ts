import { Rule } from '../index';

export const hasMissingFields = () => new Rule(
    2,
    'Missing info',
    'Fill in name, description, contact info, power need and sound amplification please.',
    (entity) => {
        return {
            triggered: !entity.name ||
                !entity.description ||
                !entity.contactInfo ||
                entity.powerNeed === -1 ||
                entity.amplifiedSound === -1,
        };
    }
);
