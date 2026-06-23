import DOMPurify from "dompurify";
import { MapEntity, MapEntityRepository } from "../entities";
import L from "leaflet";
import { EditorDrawer } from "./editorDrawer";
import { AreaTypeToText } from "../entities/enums";
import { getGridReference } from '../utils/gridUtils';

export class EditorPopup {
    public Create(
        entity: MapEntity,
        isEditMode: boolean,
        setMode: (nextMode: any, nextEntity?: MapEntity) => void,
        repository: MapEntityRepository,
        compareRevDiffLayer: L.LayerGroup<any>,
        map: L.Map,
        editEntityCallback: (...args: any[]) => void
    ): HTMLElement {
        const content = document.createElement('div');

        const personText = entity.nrOfPeople === 1 ? 'person' : 'people';
        const vehicleText = entity.nrOfVehicles === 1 ? 'vehicle' : 'vehicles';
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
        content.className = 'flex-column';
        content.innerHTML += `<header class="flex-row">
                                    <h3 class="flex-fill" style="margin: 0px; overflow-wrap:anywhere">${DOMPurify.sanitize(entityName)}</h3>
                                    <div class="flex-column">
                                        <a href="?id=${entity.id}" style="align-self:center; height: 18px; width: 18px;" target="_blank" title="Direct link to this area (right click & copy)">
                                            <sl-icon name="share" style="font-size: 18px;"></sl-icon>
                                        </a>
                                        <span id="grid-reference">${getGridReference(entity.layer.getBounds().getCenter(), map)}</span>
                                    </div>
                                </header>
                                <p class="scrollable" style="margin: 0;">${descriptionWithLinks}</p>
                                <div class="flex-column" style="font-weight:200; margin:5px 0;">
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
                                <div style="font-size: 14px; color:#5c5c5c; margin-bottom: 5px;">
                                    <b>${entity.area}</b> m² - 
                                    ${entity.nrOfPeople > 0 ? '<b>' + entity.nrOfPeople + ' </b>' + personText : ''}
                                    ${entity.nrOfVehicles > 0 ? ', <b>' + entity.nrOfVehicles + ' </b>' + vehicleText : ''}
                                    ${entity.additionalSqm > 0 ? ', <b>' + entity.additionalSqm + ' </b> m² other' : ''}
                                </div>
                                <div>
                                    ${entity.areaType ? `<sl-button class="cursor-pointer ${entity.areaType}" size="small" pill href="#page:guide-areatypes" title="Click for more info on area types" >
                                        ${AreaTypeToText[entity.areaType]}
                                    </sl-button>` : ''}
                                </div>`;

        const sortedRules = entity.getAllTriggeredRules().sort((a, b) => b.severity - a.severity);

        if (sortedRules.length > 0) {
            if (!entity.suppressWarnings)
                content.innerHTML += `<p style="margin: 10px 0 0 0"><b>${sortedRules.length}</b> issues found:</p> `;

            const ruleMessages = document.createElement('div');
            ruleMessages.style.maxHeight = '200px';
            ruleMessages.style.overflowY = 'auto';
            content.appendChild(ruleMessages);

            for (const rule of sortedRules) {
                if (rule.severity >= 3) {
                    ruleMessages.innerHTML += `<div class="error">${' ' + rule.message}</div>`;
                } else if (!entity.suppressWarnings) {
                    if (rule.severity >= 2) {
                        ruleMessages.innerHTML += `<div class="warning">${' ' + rule.message}</div>`;
                    } else {
                        ruleMessages.innerHTML += `<div class="info">${' ' + rule.message}</div>`;
                    }
                }
            }
        }

        if (isEditMode) {
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
                setMode('editing-info', entity);
                const entityEditor = new EditorDrawer(
                    entity,
                    repository,
                    compareRevDiffLayer,
                    editEntityCallback);
                entityEditor.render();
            };
            content.appendChild(editInfoButton);
        }
        return content;
    }
}