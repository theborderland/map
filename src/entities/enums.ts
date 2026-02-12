import * as L from 'leaflet';

export enum Colors {
    Green ='#00FF40',
    ElectricBlue = '#7AE9FF',
    Yellow = '#FFBB00',
    Red = '#FF0000',
    LightGrey = '#D1D1D1',
    Orange = '#FFA200',
    Default = Colors.ElectricBlue,
}

export enum AreaTypesColor {
    'public-offering' = '#d900ff',
    'sound-camp' = '#fc90e5',
    'normal-camp' = Colors.Default,
    'art' = '#ffffff',
    'other' = '#909090',
}

const createStyle = (
    color: string,
    fillOpacity: number,
    weight: number
): L.PathOptions => ({
    color,
    fillColor: color,
    fillOpacity,
    weight,
});

export const LayerStyles = {
    Default: createStyle(Colors.Default, 0.3, 1),
    Warning: createStyle(Colors.Yellow, 0.75, 3),
    Danger: createStyle(Colors.Red, 0.95, 5),
};
