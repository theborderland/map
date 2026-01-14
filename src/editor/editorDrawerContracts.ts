import { MapEntity, MapEntityRepository } from "../entities";

export interface EditorDrawerContext {
    entity: MapEntity;
    repository: MapEntityRepository;
    compareRevDiffLayer: L.LayerGroup<any>;
    closeDrawer: () => void;
    editEntityCallback: (action: string, extra?: string) => void;
    isLargeCamp: () => boolean;
}
export interface EditorDrawerTab {
    init(): void;
    populate(): void;
    collectChanges(): Partial<MapEntity>;
}