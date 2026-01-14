import { MapEntity } from "../../entities";
import { EditorDrawerContext, EditorDrawerTab } from "../editorDrawerContracts";
import { calculatedAreaNeeded } from "../../utils";

export class AreaTabController implements EditorDrawerTab {
    private fields!: {
        areaType: HTMLSelectElement;
        name: HTMLInputElement;
        description: HTMLTextAreaElement;
        contactInfo: HTMLInputElement;
        nrOfPeople: HTMLInputElement;
        nrOfVehicles: HTMLInputElement;
        additionalSqm: HTMLInputElement;
        amplifiedSound: HTMLInputElement;
    };

    constructor(private ctx: EditorDrawerContext) { }

    init() {
        this.fields = {
            areaType: document.getElementById('entity-area-type') as HTMLSelectElement,
            name: document.getElementById('entity-name') as HTMLInputElement,
            description: document.getElementById('entity-description') as HTMLTextAreaElement,
            contactInfo: document.getElementById('entity-contact') as HTMLInputElement,
            nrOfPeople: document.getElementById('entity-people') as HTMLInputElement,
            nrOfVehicles: document.getElementById('entity-vehicles') as HTMLInputElement,
            additionalSqm: document.getElementById('entity-other-sqm') as HTMLInputElement,
            amplifiedSound: document.getElementById('entity-sound') as HTMLInputElement
        };

        this.initEventListeners();
    }

    populate() {
        const e = this.ctx.entity;
        this.fields.areaType.value = e.areaType;
        this.fields.name.value = e.name;
        this.fields.description.value = e.description;
        this.fields.contactInfo.value = e.contactInfo;
        this.fields.nrOfPeople.value = String(e.nrOfPeople);
        this.fields.nrOfVehicles.value = String(e.nrOfVehicles);
        this.fields.additionalSqm.value = String(e.additionalSqm);
        this.fields.amplifiedSound.value = String(e.amplifiedSound);

        this.updateTextAboutNeededSpace();
    }

    collectChanges(): Partial<MapEntity> {
        return {
            areaType: this.fields.areaType.value,
            name: this.fields.name.value,
            description: this.fields.description.value,
            contactInfo: this.fields.contactInfo.value,
            nrOfPeople: Number(this.fields.nrOfPeople.value),
            nrOfVehicles: Number(this.fields.nrOfVehicles.value),
            additionalSqm: Number(this.fields.additionalSqm.value),
            amplifiedSound: Number(this.fields.amplifiedSound.value)
        };
    }

    private updateTextAboutNeededSpace() {
        let updatedEntity = this.collectChanges();
        let areaElem = document.getElementById('entity-area');
        let areaNeededElem = document.getElementById('entity-calculated-area-needed');
        areaNeededElem.innerText = String(calculatedAreaNeeded(
            updatedEntity.nrOfPeople,
            updatedEntity.nrOfVehicles,
            updatedEntity.additionalSqm
        ));
        areaElem.innerText = String(this.ctx.entity.area); // current area
    }

    private initEventListeners(): void {
        this.fields.nrOfPeople.oninput = () => {
            this.updateTextAboutNeededSpace(); 
            this.ctx.isLargeCamp();
        };
        const onInput = () => this.updateTextAboutNeededSpace();
        this.fields.nrOfVehicles.oninput = onInput;
        this.fields.additionalSqm.oninput = onInput;

        this.fields.amplifiedSound.onblur = (e) => {
            const soundGuideLink = document.getElementById('sound-guide-link') as HTMLDivElement;
            // @ts-ignore
            if (e.target.valueAsNumber > 0) {
                soundGuideLink.classList.remove('hidden');
            } else {
                soundGuideLink.classList.add('hidden');
            }
        };
    }
}
