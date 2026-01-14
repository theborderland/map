import { MapEntity } from "../../entities";
import * as Messages from "../../messages";
import { EditorDrawerContext, EditorDrawerTab } from "../editorDrawerContracts";

export class AdvancedTabController implements EditorDrawerTab {
    private fields!: {
        suppressWarnings: HTMLInputElement;
        deleteButton: HTMLButtonElement;
    };

    constructor(private ctx: EditorDrawerContext) { }

    init(): void {
        this.fields = {
            suppressWarnings: document.getElementById('entity-suppress-warnings') as HTMLInputElement,
            deleteButton: document.getElementById('entity-delete') as HTMLButtonElement
        };

        this.initEventListeners();
    }

    populate() {
        const e = this.ctx.entity;
        this.fields.suppressWarnings.checked = e.suppressWarnings;

        // Update entity links
        const links = document.getElementsByClassName('entity-link') as HTMLCollectionOf<HTMLAnchorElement>;
        for (let i = 0; i < links.length; i++) {
            links[i].href = `?id=${this.ctx.entity.id}`;
        }
    }

    collectChanges(): Partial<MapEntity> {
        return {
            suppressWarnings: this.fields.suppressWarnings.checked
        };
    }

    private initEventListeners(): void {
        this.fields.suppressWarnings.addEventListener('change', () => {
            this.ctx.entity.suppressWarnings = this.fields.suppressWarnings.checked;
        });

        this.fields.deleteButton.onclick = () => {
            const deleteReason = prompt('Are you sure you want to delete this area? Please provide a reason.', '');
            if (!deleteReason) return;

            console.log('Deleting entity with reason:', deleteReason);

            Messages.hideDrawer();
            this.ctx.editEntityCallback("delete", deleteReason);
        };
    }
}
