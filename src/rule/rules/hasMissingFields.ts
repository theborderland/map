import { Rule } from '../index';

export const hasMissingFields = () => new Rule(
    2,
    'Missing info',
    'Fill in name, description, contact info and sound amplification please.',
    (entity) => {
        return {
            triggered: !entity.name ||
                !entity.description ||
                !entity.contactInfo ||
                entity.amplifiedSound === -1,
        };
    }
);
