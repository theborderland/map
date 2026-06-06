/** The representation of a Map Entity in the API */
export interface EntityDTO {
    id: number;
    revision: number;
    geoJson: string;
    timeStamp: number;
    isDeleted: boolean;
    deleteReason: string;
}

export interface EntityDifferences {
    what: string;
    changeShort: string;
    changeLong: string;
}

export interface Appliance {
    name: string,
    amount: number,
    watt: number
}