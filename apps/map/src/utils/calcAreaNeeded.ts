const SQM_PER_PERSON: number = 10;
const SQM_PER_VEHICLE: number = 70;

/** Calculated area needed for this map entity from the given information */
export function calculatedAreaNeeded(
    nrOfPeople: number,
    nrOfVehicles: number,
    additionalSqm: number,
): number {
    try {
        let calculatedareaneed = 0;

        if (nrOfPeople) {
            calculatedareaneed += nrOfPeople * SQM_PER_PERSON;
        }
        if (nrOfVehicles) {
            calculatedareaneed += nrOfVehicles * SQM_PER_VEHICLE;
        }
        if (additionalSqm) {
            calculatedareaneed += additionalSqm;
        }

        return calculatedareaneed;
    } catch {
        return NaN;
    }
}