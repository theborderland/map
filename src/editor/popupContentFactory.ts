import DOMPurify from "dompurify";
import { MapEntity, MapEntityRepository } from "../entities";
import * as Buttons from './buttonsFactory';
import { EntityDifferences } from "../entities/entity";
import L from "leaflet";
import { EntityInfoEditor } from "./entityInfoEditor";
import { formatDate } from "../utils";

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
        const entityPowerNeed = entity.powerNeed != -1
            ? `${entity.powerNeed} Watts`
            : 'Please state your power need! Set to 0 if you will not use electricity.';
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
                                    <h3 style="margin: 0px;">${DOMPurify.sanitize(entityName)}</h3>
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

            const editShapeButton = Buttons.simple('Edit shape', (e) => {
                e.stopPropagation();
                e.preventDefault();
                setMode('editing-shape', entity);
            });
            content.appendChild(editShapeButton);

            const moveShapeButton = Buttons.simple('Move', (e) => {
                e.stopPropagation();
                e.preventDefault();
                setMode('moving-shape', entity);
            });
            content.appendChild(moveShapeButton);

            const editInfoButton = Buttons.simple('Edit info', (e) => {
                e.stopPropagation();
                e.preventDefault();
                setMode('editing-info', entity);
            });
            content.appendChild(editInfoButton);

            const editInfoButtonNew = Buttons.simple('Edit info [new]', (e) => {
                e.stopPropagation();
                e.preventDefault();
                entityInfoEditor.render();
                });
            content.appendChild(editInfoButtonNew);
        }
        return content;
    }

    public CreateEditPopup(
        entity: MapEntity,
        isEditMode: boolean,
        setMode: (nextMode: string, nextEntity?: MapEntity) => void,
        setPopup: (display: string, entity?: MapEntity | null) => void,
        refreshEntity: (entity: MapEntity, checkRules?: boolean) => void,
        updateOnScreenDisplay: (entity: MapEntity | null, customMsg?: string) => void,
    ): HTMLElement {
        let updateTextAboutNeededSpace = (entity: MapEntity, div: HTMLElement = null) => {
            refreshEntity(entity);
            updateOnScreenDisplay(entity);
            let areaInfo = document.getElementById('areaInfo');
            if (!areaInfo) {
                areaInfo = div;
            }
            areaInfo.innerHTML =
                'With this amount of people, vehicles and extra m² such as art, kitchen tents and structures, a suggested camp size is <b>' +
                entity?.calculatedAreaNeeded +
                'm²</b>. Currently the area is <b>' +
                entity?.area +
                'm².</b>';
        };

        const content = document.createElement('div');
        content.innerHTML = ``;
        content.appendChild(document.createElement('label')).innerHTML = 'Name of camp/dream';

        const nameField = document.createElement('input');
        nameField.type = 'text';
        nameField.value = entity.name;
        nameField.maxLength = 100;
        nameField.placeholder = 'Enter camp name here..';
        nameField.oninput = () => {
            entity.name = nameField.value;
            refreshEntity(entity);
        };
        content.appendChild(nameField);

        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('label')).innerHTML = 'Description';

        const descriptionField = document.createElement('textarea');
        descriptionField.value = entity.description;
        descriptionField.maxLength = 300;
        descriptionField.placeholder =
            'Describe your camp/dream here as much as you want. Remember that this information is public. 300 characters max.';
        descriptionField.style.height = '100px';
        descriptionField.oninput = () => {
            entity.description = descriptionField.value;
            refreshEntity(entity);
            updateOnScreenDisplay(entity);
        };
        content.appendChild(descriptionField);

        content.appendChild(document.createElement('label')).innerHTML = 'Contact info';
        const contactField = document.createElement('input');
        contactField.type = 'text';
        contactField.value = entity.contactInfo;
        contactField.placeholder = 'Email, phone, discord name etc';
        contactField.oninput = () => {
            entity.contactInfo = contactField.value;
            refreshEntity(entity);
            updateOnScreenDisplay(entity);
        };
        content.appendChild(contactField);

        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('b')).innerHTML = 'People';

        const peopleField = document.createElement('input');
        peopleField.title = '10m² per person';
        peopleField.style.width = '3em';
        peopleField.style.marginBottom = '7px';
        peopleField.style.marginLeft = '5px';
        peopleField.type = 'number';
        peopleField.value = String(entity.nrOfPeople);
        peopleField.min = '0';
        peopleField.oninput = () => {
            entity.nrOfPeople = Number(peopleField.value);
            updateTextAboutNeededSpace(entity);
        };
        content.appendChild(peopleField);

        const personText = document.createElement('span');
        personText.innerHTML = ' x 10m²';
        personText.style.fontSize = '12px';
        personText.style.marginRight = '25px';
        content.appendChild(personText);

        content.appendChild(document.createElement('b')).innerHTML = ' Vehicles ';
        const vehiclesField = document.createElement('input');
        vehiclesField.title = '70m² per vehicle';
        vehiclesField.style.width = '3em';
        vehiclesField.style.marginLeft = '5px';
        vehiclesField.type = 'number';
        vehiclesField.value = String(entity.nrOfVehicles);
        vehiclesField.min = '0';
        vehiclesField.oninput = () => {
            entity.nrOfVehicles = Number(vehiclesField.value);
            updateTextAboutNeededSpace(entity);
        };
        content.appendChild(vehiclesField);

        const vehicleText = document.createElement('span');
        vehicleText.innerHTML = ' x 70m²';
        vehicleText.style.fontSize = '12px';
        content.appendChild(vehicleText);

        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('b')).innerHTML = 'Other stuff in m²';
        const otherSqm = document.createElement('input');
        otherSqm.title = 'Area needed for kitchen, storage, workshop tents etc.';
        otherSqm.style.width = '6.2em';
        otherSqm.style.marginLeft = '116px';
        otherSqm.type = 'number';
        otherSqm.value = String(entity.additionalSqm);
        otherSqm.min = '0';
        otherSqm.oninput = () => {
            entity.additionalSqm = Number(otherSqm.value);
            updateTextAboutNeededSpace(entity);
        };
        content.appendChild(otherSqm);

        let areaInfo = content.appendChild(document.createElement('div'));
        areaInfo.id = 'areaInfo';
        areaInfo.style.marginTop = '10px';
        areaInfo.style.marginBottom = '5px';
        areaInfo.style.fontSize = '12px';
        updateTextAboutNeededSpace(entity, areaInfo);

        content.appendChild(document.createElement('b')).innerHTML = 'Power need (Watts) ';

        const powerField = document.createElement('input');
        powerField.title =
            'A water boiler is about 2000W, a fridge is about 100W,\na laptop is about 50W, a phone charger is about 10W.';
        powerField.style.width = '5em';
        powerField.style.marginTop = '7px';
        powerField.style.marginBottom = '7px';
        powerField.style.marginLeft = '110px';
        powerField.type = 'number';
        powerField.value = String(entity.powerNeed);
        powerField.placeholder = '?';
        powerField.min = '0';
        powerField.oninput = () => {
            //@ts-ignore
            entity.powerNeed = powerField.value;
            refreshEntity(entity);
            updateOnScreenDisplay(entity);
        };
        content.appendChild(powerField);

        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('b')).innerHTML = 'Sound amplification (Watts) ';

        const soundField = document.createElement('input');
        soundField.style.width = '5em';
        soundField.title =
            'If over 100W then you are considered a sound camp.\nPlease get in contact with the sound lead.';
        soundField.style.marginBottom = '7px';
        soundField.style.marginLeft = '58px';
        soundField.type = 'number';
        soundField.value = String(entity.amplifiedSound);
        soundField.min = '0';
        soundField.placeholder = '?';
        soundField.oninput = () => {
            //@ts-ignore
            entity.amplifiedSound = soundField.value;
            refreshEntity(entity);
            updateOnScreenDisplay(entity);
        };
        content.appendChild(soundField);

        content.appendChild(document.createElement('p'));

        if (isEditMode) {
            const saveInfoButton = Buttons.simple('Ok!', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                setMode('blur');
            });
            saveInfoButton.style.width = '200px';
            content.appendChild(saveInfoButton);

            const moreButton = Buttons.simple('More...', (e) => {
                e.stopPropagation();
                e.preventDefault();
                setPopup('more', entity);
            });
            moreButton.style.marginRight = '0';
            content.appendChild(moreButton);
        }

        content.onkeydown = (evt: Event) => {
            if ('key' in evt
                && evt.key === 'Enter'
                && 'ctrlKey' in evt
                && evt.ctrlKey == true) {
                setMode('blur');
            }
        };

        return content;
    }

    public CreateMoreInfoPopup(
        entity: MapEntity,
        setMode: (nextMode: string, nextEntity?: MapEntity) => void,
        setPopup: (display: string, entity?: MapEntity | null) => void,
        refreshEntity: (entity: MapEntity, checkRules?: boolean) => void,
        deleteAndRemoveEntity: (entity: MapEntity, deleteReason: string) => void,
    ): HTMLElement {
        const content = document.createElement('div');
        content.innerHTML = ``;

        content.appendChild(document.createElement('h2')).innerHTML = 'More stuff';

        let formattedDate = formatDate(entity.timeStamp);

        let entityInfo = content.appendChild(document.createElement('div'));
        entityInfo.innerHTML =
            `<b>Entity Id: </b> ${entity.id}` +
            `<br><b>Revisions: </b> ${entity.revision}` +
            `<br><b>Last edited:</b> ${formattedDate}`;
        content.appendChild(document.createElement('br'));

        //A link that when pressed will copy "entity.id" to the clipboard
        let copyLink = content.appendChild(document.createElement('a'));
        copyLink.innerHTML = 'Click here to copy a link to this entity';
        copyLink.href = '?id=' + entity.id;
        copyLink.onclick = (e) => {
            console.log('Copy to clipboard', copyLink.href);
            e.stopPropagation();
            e.preventDefault();
            navigator.clipboard.writeText(copyLink.href);
            return false;
        };

        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('b')).innerHTML = 'Supress yellow warnings';
        const supressWarnings = document.createElement('input');
        supressWarnings.type = 'checkbox';
        supressWarnings.style.marginLeft = '10px';
        supressWarnings.checked = entity.supressWarnings;
        supressWarnings.onchange = () => {
            entity.supressWarnings = supressWarnings.checked;
            refreshEntity(entity);
        };
        content.appendChild(supressWarnings);

        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('b')).innerHTML = 'Custom color ';
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.style.width = '66px';
        colorPicker.style.marginLeft = '146px';
        colorPicker.value = entity.color;
        colorPicker.onchange = () => {
            entity.color = colorPicker.value;
            refreshEntity(entity);
        };
        content.appendChild(colorPicker);

        content.appendChild(document.createElement('p'));

        const deleteButton = Buttons.simple('Delete', async (e) => {
            let deleteReason = prompt('Are you really sure you should delete this area? Answer why.', '');
            if (deleteReason == null || deleteReason == '') {
                console.log('Delete nope, deleteReason', deleteReason);
                return;
            }
            console.log('Delete yes, deleteReason', deleteReason);

            e.stopPropagation();
            e.preventDefault();
            deleteAndRemoveEntity(entity, deleteReason);
        });
        deleteButton.classList.add('delete-button');
        deleteButton.style.width = '100%';
        content.appendChild(deleteButton);

        const historyButton = Buttons.simple('History', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            setPopup('history', entity);
        });
        historyButton.style.marginRight = '0';
        content.appendChild(historyButton);

        let deleteInfo = content.appendChild(document.createElement('div'));
        deleteInfo.innerHTML = `Use delete with caution! Only delete things you know is ok. Undelete can only be performed by using black magic.`;

        content.appendChild(document.createElement('br'));

        const backButton = Buttons.simple('Back', (e) => {
            e.stopPropagation();
            e.preventDefault();
            setMode('blur');
        });
        backButton.style.width = '200px';
        content.appendChild(backButton);

        return content;
    }

    public async CreateHistoryPopup(
        entity: MapEntity,
        repository: MapEntityRepository,
        ghostLayers: L.LayerGroup<any>,
        setMode: (nextMode: string, nextEntity?: MapEntity) => void,
        getEntityDifferences: (current: MapEntity, previous: MapEntity) => Array<EntityDifferences>,
        removeEntityNameTooltip: (entity: MapEntity) => void,
        removeEntityFromLayers: (entity: MapEntity) => void,
        addEntityToMap: (entity: MapEntity, checkRules?: boolean) => void,
    ): Promise<HTMLElement> {
        const content = document.createElement('div');
        content.innerHTML = ``;

        content.appendChild(document.createElement('h2')).innerHTML = 'Edit-History';

        let formattedDate = formatDate(entity.timeStamp);

        let entityInfo = content.appendChild(document.createElement('div'));
        entityInfo.innerHTML =
            `<b>Entity Id: </b> ${entity.id}<br>` +
            `<b>Name: </b> ${entity.name}<br>` +
            `<b>Revisions: </b> ${entity.revision}<br>` +
            `<b>Last edited:</b> ${formattedDate}`;
        content.appendChild(document.createElement('br'));

        // Prepare table for showing revisions
        const divtable = document.createElement('div');
        divtable.id = 'history-table';
        content.appendChild(divtable);

        const divdescription = document.createElement('div');
        divdescription.id = 'change-description';

        const divdescriptionheader = document.createElement('h3');
        divdescriptionheader.innerText = 'Description';
        
        const divdescriptionframe = document.createElement('div');
        divdescriptionframe.append(divdescriptionheader);
        divdescriptionframe.append(divdescription);
        content.appendChild(divdescriptionframe);

        const table: HTMLTableElement = document.createElement('table');
        divtable.appendChild(table);

        const thead = table.createTHead();
        const theadrow: HTMLTableRowElement = thead.insertRow();
        theadrow.insertCell().innerText = 'Revision';
        theadrow.insertCell().innerText = 'Timestamp';
        theadrow.insertCell().innerText = 'What Changed';
        const tbody = table.createTBody();

        // Get revisions and create tale rows for each revision
        await repository.getRevisionsForEntity(entity);
        // console.log('result from getRevisionsForEntity', entity.revisions);
        let rowsToAdd: Array<HTMLTableRowElement> = [];
        let entityCurrent = null;
        let entityPrevious = null;
        const GhostLayerStyle: L.PathOptions = {
            color: '#ff0000',
            fillColor: '#000000',
            fillOpacity: 0.5,
            weight: 5,
        };
        for (let revisionentity in entity.revisions) {
            // Prepare list with individual changes for revision
            let ulChanges = document.createElement('ul');
            const row: HTMLTableRowElement = document.createElement('tr');
            entityCurrent = entity.revisions[revisionentity];
            row.insertCell().innerText = entityCurrent.revision;
            row.insertCell().innerText = formatDate(entityCurrent.timeStamp, 'short', 'medium');
            row.insertCell().append(ulChanges);
            let diff = getEntityDifferences(entityCurrent, entityPrevious);
            // console.log('Differences', diff);
            for (let changeid in diff) {
                let change = diff[changeid];
                let li = document.createElement('li');
                li.innerText = change['changeShort'];
                let a = document.createElement('a');
                a.href = '#';
                a.innerText = ' Show';
                a.title = 'Show a detailed description about this change.';
                a.onclick = () => {
                    let entityRevSelected = entity.revisions[revisionentity];
                    divdescriptionheader.innerText = `Description of revision ${revisionentity}`;
                    divdescription.innerText = `${change['changeLong']}\n\n`;
                    // Restore buttons
                    let btnRestoreDetails = L.DomUtil.create('button', 'history-button');
                    btnRestoreDetails.title = `Restores detailes from revision ${revisionentity}.`;
                    btnRestoreDetails.textContent = '⚠ Restore Details';
                    btnRestoreDetails.onclick = () => {
                        console.log(`Restores detailes from revision ${revisionentity}.`);
                        entity.name = entity.revisions[revisionentity].name;
                        entity.description = entity.revisions[revisionentity].description;
                        entity.contactInfo = entity.revisions[revisionentity].contactInfo;
                        entity.nrOfPeople = entity.revisions[revisionentity].nrOfPeople;
                        entity.nrOfVehicles = entity.revisions[revisionentity].nrOfVehicles;
                        entity.additionalSqm = entity.revisions[revisionentity].additionalSqm;
                        entity.powerNeed = entity.revisions[revisionentity].powerNeed;
                        entity.amplifiedSound = entity.revisions[revisionentity].amplifiedSound;
                        entity.color = entity.revisions[revisionentity].color;
                        entity.supressWarnings = entity.revisions[revisionentity].supressWarnings;
                    };
                    divdescription.append(btnRestoreDetails);
                    let btnRestoreShape = L.DomUtil.create('button', 'history-button');
                    btnRestoreShape.title = `Restores shape from revision ${revisionentity}.`;
                    btnRestoreShape.textContent = '⚠ Restore Shape';
                    btnRestoreShape.onclick = () => {
                        console.log(`Restores shape from revision ${revisionentity}.`);
                        // First remove currently drawn shape to avoid duplicates
                        removeEntityNameTooltip(entity);
                        removeEntityFromLayers(entity);
                        entity.layer = entity.revisions[revisionentity].layer;
                        addEntityToMap(entity);
                    };
                    divdescription.append(btnRestoreShape);
                    // Draw ghosted shape of selected revision
                    ghostLayers.clearLayers();
                    entityRevSelected.layer.setStyle(GhostLayerStyle);
                    ghostLayers.addLayer(entityRevSelected.layer);
                };
                li.append(a);
                ulChanges.append(li);
            }
            rowsToAdd.push(row);
            entityPrevious = entityCurrent;
        }

        // Add all history-rows backwards
        rowsToAdd
            .slice()
            .reverse()
            .forEach(function (row) {
                tbody.append(row);
            });

        const backButton = Buttons.simple('Back', (e) => {
            e.stopPropagation();
            e.preventDefault();
            setMode('blur');
        });
        backButton.style.width = '200px';
        content.appendChild(backButton);

        return content
    }
}