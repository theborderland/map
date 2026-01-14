import { EditorDrawerTab, EditorDrawerContext } from "../editorDrawerContracts";
import { Appliance, MapEntity } from "../../entities";

export class PowerTabController implements EditorDrawerTab {
    private fields!: {
        areaNeedPower: HTMLInputElement;
        powerContactInfo: HTMLInputElement;
        powerPlugType: HTMLSelectElement;
        powerExtraInfo: HTMLInputElement;
        powerImageUrl: HTMLInputElement;
        powerNeed: HTMLSpanElement;
    };

    constructor(private ctx: EditorDrawerContext) { }

    init(): void {
        this.fields = {
            areaNeedPower: document.getElementById("entity-area-need-power") as HTMLInputElement,
            powerContactInfo: document.getElementById("entity-tech-lead") as HTMLInputElement,
            powerPlugType: document.getElementById("power-plug-type") as HTMLSelectElement,
            powerExtraInfo: document.getElementById("power-extra-info") as HTMLInputElement,
            powerImageUrl: document.getElementById("power-image-url") as HTMLInputElement,
            powerNeed: document.getElementById("entity-total-power-needed") as HTMLSpanElement
        };

        this.initEventListeners();
    }

    populate(): void {
        const e = this.ctx.entity;

        this.fields.areaNeedPower.checked = e.areaNeedPower;
        this.fields.powerContactInfo.value = e.powerContactInfo;
        this.fields.powerPlugType.value = e.powerPlugType;
        this.fields.powerExtraInfo.value = e.powerExtraInfo;
        this.fields.powerImageUrl.value = e.powerImageUrl;
        this.fields.powerNeed.innerText = String(e.powerNeed);

        // Populate appliances (reverse so newest ends up on top)
        for (let i = e.powerAppliances.length; i--;) {
            const item = e.powerAppliances[i];
            this.addApplianceToContainer([item.name, item.amount, item.watt]);
        }

        this.togglePowerSections();
        this.validatePowerImageUrl();
        this.checkIfLargeCamp();
    }

    collectChanges(): Partial<MapEntity> {
        return {
            areaNeedPower: this.fields.areaNeedPower.checked,
            powerContactInfo: this.fields.powerContactInfo.value,
            powerPlugType: this.fields.powerPlugType.value,
            powerExtraInfo: this.fields.powerExtraInfo.value,
            powerImageUrl: this.fields.powerImageUrl.value,
            powerNeed: Number(this.fields.powerNeed.innerText),
            powerAppliances: this.getAppliancesFromUi()
        };
    }

    private initEventListeners() {
        this.fields.areaNeedPower.addEventListener("sl-input", () => {
            this.togglePowerSections();
            this.checkIfLargeCamp();
        });

        this.fields.powerImageUrl.addEventListener("blur", () => {
            this.validatePowerImageUrl();
        });

        const powerForm = document.getElementById("power-form") as HTMLFormElement;
        powerForm.addEventListener("submit", (e) => this.onPowerFormSubmit(e));

        const container = document.getElementById("power-items-container");
        container.addEventListener("click", (e) => {
            const target = e.target as HTMLElement;
            const deleteBtn = target.closest('[data-action="delete-power-item"]');
            if (!deleteBtn) return;

            const row = deleteBtn.closest(".power-item");
            if (!row) return;

            row.remove();
            this.calculateTotalPower();
        });
    }

    private onPowerFormSubmit(event: Event) {
        event.preventDefault();

        const applianceInput = document.getElementById("appliance") as HTMLInputElement;
        const amountInput = document.getElementById("amount") as HTMLInputElement;
        const wattInput = document.getElementById("watt") as HTMLInputElement;

        const name = applianceInput.value.trim();
        const amount = Math.ceil(amountInput.valueAsNumber);
        const watt = Math.ceil(wattInput.valueAsNumber);

        if (!name || amount < 1 || watt < 1) return;

        this.addApplianceToContainer([name, amount, watt]);

        (event.target as HTMLFormElement).reset();
        applianceInput.focus();

        // requestAnimationFrame to ensure UI is updated, sometimes the adding of new item lagging a bit behind
        requestAnimationFrame(() => this.calculateTotalPower());
    }

    /**
     * @param values Should be [name, amount, watt]
     */
    private addApplianceToContainer(values: [string, number, number]) {
        const container = document.getElementById("power-items-container") as HTMLDivElement;
        const template = document.getElementById("power-item-template") as HTMLTemplateElement;
        if (!container || !template) return;

        const fragment = template.content.cloneNode(true) as DocumentFragment;
        const row = fragment.querySelector(".power-item") as HTMLElement;
        const inputs = row.querySelectorAll("sl-input");

        inputs.forEach((input, index) => {
            // @ts-ignore Shoelace typing
            input.value = values[index];
            if (index === 0) return; // skip name
            input.addEventListener("blur", () => this.calculateTotalPower());
        });

        this.addDeleteButton(row);
        container.prepend(row); // Add item on top of list
    }

    private addDeleteButton(row: HTMLElement) {
        const template = document.getElementById("delete-button-template") as HTMLTemplateElement;
        if (!template) return;

        row.appendChild(template.content.cloneNode(true));
    }

    private getAppliancesFromUi(): Appliance[] {
        const items = document.querySelectorAll("#power-items-container .power-item") as NodeListOf<HTMLDivElement>;

        return Array.from(items).map(row => ({
            // @ts-ignore
            name: row.children[0].value,
            // @ts-ignore
            amount: Math.ceil(Number(row.children[1].value)),
            // @ts-ignore
            watt: Math.ceil(Number(row.children[2].value))
        }));
    }

    private calculateTotalPower() {
        const appliances = this.getAppliancesFromUi();
        const totalWatt = appliances.reduce(
            (sum, a) => sum + a.amount * a.watt,
            0
        );

        this.fields.powerNeed.innerText = Math.ceil(totalWatt).toString();
        this.checkIfLargeCamp();
    }

    private checkIfLargeCamp() {
        const powerDiagramSection = this.fields.powerImageUrl.parentElement;

        const isLargeCamp = this.fields.areaNeedPower.checked && this.ctx.isLargeCamp();
        powerDiagramSection?.classList.toggle("hidden", !isLargeCamp);
    }

    private togglePowerSections() {
        document
            .querySelectorAll(".power-toggle")
            .forEach(section =>
                this.fields.areaNeedPower.checked
                    ? section.classList.remove("hidden")
                    : section.classList.add("hidden")
            );
    }

    private validatePowerImageUrl() {
        const icons = this.fields.powerImageUrl.querySelectorAll("sl-icon");
        const valid = this.fields.powerImageUrl.value !== "";
        icons.forEach(icon =>
            valid ? icon.classList.add("hidden") : icon.classList.remove("hidden")
        );
    }
}
