import { Rule, Severity } from '../index';

export const hasMissingFields = () => new Rule(
    Severity.High,
    'Missing info',
    'Fill in name, description, contact info, power need and sound amplification please.',
    (entity) => {
        return {
            triggered: !entity.name ||
                !entity.description ||
                !entity.contactInfo ||
                (entity.areaNeedPower && entity.powerNeed === -1) ||
                entity.amplifiedSound === -1,
        };
    }
);
