import DOMPurify from "dompurify";
import { MapEntity, MapEntityRepository } from "../entities";
import L from "leaflet";
import { EntityInfoEditor } from "./entityInfoEditor";

export class PopupContentFactory {
    public CreateInfoPopup(
        entity: MapEntity,
        isEditMode: boolean,
        setMode: (nextMode: string, nextEntity?: MapEntity) => void,
        repository: MapEntityRepository,
        ghostLayers: L.LayerGroup<any>,
        editEntityCallback: (...args: any[]) => void
    ): HTMLElement {
        const content = document.createElement('div');

        const personText = entity.nrOfPeople === 1 ? ' person,' : ' people,';
        const vehicleText = entity.nrOfVehicles === 1 ? ' vehicle,' : ' vehicles,';
        const entityName = entity.name ? entity.name : '<i>No name yet</i>';
        const entityDescription = entity.description ? entity.description : '<i>No description yet</i>';
        const entityContactInfo = entity.contactInfo
            ? entity.contactInfo
            : 'Please add contact info! Areas without it might be removed.';
        const entityPowerNeed = entity.areaNeedPower && entity.powerNeed != -1
            ? `${entity.powerNeed} Watts`
            : !entity.areaNeedPower 
                ? '0'
                : 'Please state your power need! Uncheck the box if you will not use electricity.';
        const entitySoundAmp = entity.amplifiedSound != -1
            ? `${entity.amplifiedSound} Watts`
            : 'Please set sound amplification! Set to 0 if you wont have speakers.';

        let descriptionSanitized = DOMPurify.sanitize(entityDescription);
        // URLs starting with http://, https://, or ftp://
        let replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        let descriptionWithLinks = descriptionSanitized.replace(
            replacePattern1,
            '<a href="$1" target="_blank">$1</a>'
        );
        
        content.innerHTML += `<div class="flex-column" style="margin-bottom: 10px;">
                                <header class="flex-row">
                                    <h3 class="flex-fill" style="margin: 0px; overflow-wrap:anywhere">${DOMPurify.sanitize(entityName)}</h3>
                                    <a href="?id=${entity.id}" style="margin: 5px;">
                                        <sl-icon name="share" title="Direct link to this area (right click & copy)" style="font-size: 18px;"></sl-icon>
                                    </a>
                                </header>
                                <p class="scrollable" style="margin: 0;">${descriptionWithLinks}</p>
                                <div class="flex-column" style="font-weight:200; margin:10px 0 5px 0;">
                                    <div>
                                        <b>Contact:</b> ${DOMPurify.sanitize(entityContactInfo)}   
                                    </div>
                                    <div>
                                        <b>Power:</b> ${entityPowerNeed}
                                    </div>
                                    <div>
                                        <b>Sound:</b> ${entitySoundAmp}
                                    </div>
                                </div> 
                                <div style="font-size: 14px; color:#5c5c5c; margin: 0;">
                                    <b>${entity.area}</b> m² - 
                                    ${entity.nrOfPeople > 0 ? '<b>' + entity.nrOfPeople + '</b>' + personText : ''} 
                                    ${entity.nrOfVehicles > 0 ? '<b>' + entity.nrOfVehicles + '</b>' + vehicleText : ''} 
                                    ${entity.additionalSqm > 0 ? '<b>' + entity.additionalSqm + '</b> m² other' : ''}
                                </div>
                            </div>`;

        const sortedRules = entity.getAllTriggeredRules().sort((a, b) => b.severity - a.severity);

        if (sortedRules.length > 0) {
            if (!entity.supressWarnings)
                content.innerHTML += `<p style="margin: 10px 0 0 0"><b>${sortedRules.length}</b> issues found:</p> `;

            const ruleMessages = document.createElement('div');
            ruleMessages.style.maxHeight = '200px';
            ruleMessages.style.overflowY = 'auto';
            content.appendChild(ruleMessages);

            for (const rule of sortedRules) {
                if (rule.severity >= 3) {
                    ruleMessages.innerHTML += `<div class="error">${' ' + rule.message}</div>`;
                } else if (!entity.supressWarnings) {
                    if (rule.severity >= 2) {
                        ruleMessages.innerHTML += `<div class="warning">${' ' + rule.message}</div>`;
                    } else {
                        ruleMessages.innerHTML += `<div class="info">${' ' + rule.message}</div>`;
                    }
                }
            }
        }

        if (isEditMode) {
            const entityInfoEditor = new EntityInfoEditor(
                entity,
                repository,
                ghostLayers,
                editEntityCallback);

            const editShapeButton = document.createElement('button');
            editShapeButton.innerHTML = "Edit shape";
            editShapeButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                setMode('editing-shape', entity);
            };
            content.appendChild(editShapeButton);

            const moveShapeButton = document.createElement('button');
            moveShapeButton.innerHTML = "Move shape"
            moveShapeButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                setMode('moving-shape', entity);
            };
            content.appendChild(moveShapeButton);

            const editInfoButton = document.createElement('button');
            editInfoButton.innerHTML = "Edit info"
            editInfoButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                entityInfoEditor.render();
            };
            content.appendChild(editInfoButton);
        }
        return content;
    }
}