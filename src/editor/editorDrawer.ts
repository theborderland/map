import L from "leaflet";
import { MapEntity, MapEntityRepository } from "../entities";
import * as Messages from '../messages';
import { EditorDrawerContext as EditorDrawerContext, EditorDrawerTab } from "./editorDrawerContracts";
import * as Tabs from "./tabs";

export class EditorDrawer {
    private tabs: EditorDrawerTab[] = [];
    private readonly LARGE_CAMP_PEOPLE_LIMIT = 25;
    private readonly LARGE_CAMP_POWER_LIMIT = 5000;

    constructor(
        private entity: MapEntity,
        private repository: MapEntityRepository,
        private compareRevDiffLayer: L.LayerGroup<any>,
        private editCallback: (action: string, extra?: string) => void
    ) { }

    public render(): void {
        Messages.showDrawer(
            {
                file: "edit-entity",
                position: "end",
                onClose: () => this.editCallback("cancel"),
                buttons: [
                    {
                        text: "Save",
                        variant: "primary",
                        onClickAction: () => this.save(),
                        shouldCloseDrawer: true
                    },
                    {
                        text: "Cancel",
                        variant: "neutral",
                        onClickAction: () => this.editCallback("cancel"),
                        shouldCloseDrawer: true
                    }
                ]
            },
            {},
            () => this.initTabs()
        );
    }

    private initTabs() {
        const context: EditorDrawerContext = {
            entity: this.entity,
            repository: this.repository,
            compareRevDiffLayer: this.compareRevDiffLayer,
            closeDrawer: () => Messages.hideDrawer(),
            editEntityCallback: this.editCallback,
            isLargeCamp: () => this.isLargeCamp()
        };

        this.tabs = [
            new Tabs.AreaTabController(context),
            new Tabs.PowerTabController(context),
            new Tabs.HistoryTabController(context),
            new Tabs.AdvancedTabController(context)
        ];

        this.tabs.forEach(tab => {
            tab.init();
            tab.populate();
        });
    }

    private save() {
        const changes = this.collectChanges();
        this.entity.updateEntity(changes as MapEntity);
        this.editCallback("save");
    }

    private collectChanges(): Partial<MapEntity> {
        return this.tabs.reduce(
            (acc, tab) => ({ ...acc, ...tab.collectChanges() }),
            {}
        );
    }

    private isLargeCamp(): boolean {
        const changes = this.collectChanges();

        return changes.nrOfPeople >= this.LARGE_CAMP_PEOPLE_LIMIT ||
                Number(changes.powerNeed) >= this.LARGE_CAMP_POWER_LIMIT;
    }
}
