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
            new Tabs.AdvancedTabController(context),
            new Tabs.HistoryTabController(context),
            new Tabs.AreaTabController(context),
            new Tabs.PowerTabController(context), // needs to be last to calculate isLargeCamp() correctly
        ];

        this.tabs.forEach(tab => {
            tab.init();
            tab.populate();
        });
    }

    private save(): boolean | null {
        if (!this.validateRequiredFields()) {
            return false;
        }
        const changes = this.collectChanges();
        this.entity.updateEntity(changes as MapEntity);
        this.editCallback("save");
        return true;
    }

    /** Validates all required fields across all tabs and switches to the first invalid tab */
    private validateRequiredFields(): boolean {
        const tabGroup = document.querySelector('sl-tab-group') as any;
        if (!tabGroup) {
            return true;
        }

        const forms = Array.from(tabGroup.querySelectorAll('form')) as HTMLFormElement[];
        let invalidTab: string | null = null;
        let invalidForm: HTMLFormElement | null = null;

        for (const form of forms) {
            if (!form.checkValidity()) {
                invalidForm = invalidForm || form;
                if (!invalidTab) {
                    const tabPanel = form.closest('sl-tab-panel');
                    invalidTab = tabPanel?.getAttribute('name') ?? null;
                }
            }
        }

        if (!invalidForm || !invalidTab) {
            return invalidForm === null;
        }

        tabGroup.show(invalidTab);
        setTimeout(() => {
            invalidForm.reportValidity();
        }, 100);

        return false;
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
