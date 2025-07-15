const letterToSpanElementMap = new Map();
const eventCountToShow = 50;
const maxLettersOnScreen = getMaxLettersOnScreen();
const eventsFilename = 'events fixed.json';

const transformSpecialLetters = letter => {
        switch (letter) {
            case 'Å': return 'AA';
            case 'Ä': return 'AE';
            case 'Ö': return 'OE';
            case ' ': return 'blank';
            case '.': return 'dot';
            case '+': return 'dotdotdot';
            case '/': return 'slash';
            case '&': return 'ampersand';
            default: return letter;
        }
    };

function createMap() {
    let swedishAlphabetAndNumbers = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
        'Å', 'Ä', 'Ö',
        '.', ' ', '/', '&',
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        '+', // This is used for the "dotdotdot" representation
    ];

    // Transform special letters to their respective representations
    for (let letter of swedishAlphabetAndNumbers) {
        letter = transformSpecialLetters(letter);
        let span = document.createElement('span');
        span.classList.add('letter');
        span.classList.add('letter-' + letter);
        letterToSpanElementMap.set(letter, span);
    }
}

/** * Calculates the maximum number of letters that can fit on the screen based on the width of a letter.
 * It creates a hidden span element with a sample letter, measures its width,
 * and divides the screen width by the letter width to determine how many letters can fit.
 * @returns {number} - The maximum number of letters that can fit on the screen.
 */
function getMaxLettersOnScreen() {
    const sampleSpan = document.createElement('span');
    sampleSpan.className = 'letter letter-A';
    sampleSpan.style.visibility = 'hidden';
    document.body.appendChild(sampleSpan);

    const letterWidth = sampleSpan.getBoundingClientRect().width || 1; // Avoid division by zero
    document.body.removeChild(sampleSpan);

    const container = document.getElementById('board-container');
    const containerWidth = container ? container.getBoundingClientRect().width : window.innerWidth;
    let maxLetters = Math.floor(containerWidth / letterWidth);
    console.log(`Max letters on screen: ${maxLetters}`);
    return maxLetters;
}

function removeUnwantedCharacters(text) {
    return text
        .toUpperCase()
        .split('')
        .filter(char => letterToSpanElementMap.has(transformSpecialLetters(char)))
        .join('');
}

/** * Transforms the events information into a format suitable for display.
 * Pads the "time location" part to the max length, filters out unwanted characters,
 * and trims sentences to a maximum of 30 characters.
 * @param {Array} events - Array of event objects containing time, location, and eventName.
 * @returns {Array} - Array of transformed sentences ready for display.
 */
function createEventSummaryText(eventsRaw) {
    let maxLengthOfTimeAndHostName = 16; 

    let events = eventsRaw.map(event => ({
        ...event,
        summary_start_time: removeUnwantedCharacters(event.start_time),
        summary_host: removeUnwantedCharacters(event.host),
        summary_event_title: removeUnwantedCharacters(event.event_title)
    }));
    
    // Find the max length of "time location" part
    const maxTimeAndHostLength = Math.max(...events.map(event =>
        // Add + 1 in the end to accounts for the "..."
        `${event.summary_start_time} ${event.summary_host.slice(0, maxLengthOfTimeAndHostName + 1)}`.length
    ));

    // Pad the "time location" part to the max length
    for (let event of events) {
        let host = `${event.summary_host.length > maxLengthOfTimeAndHostName
            ? event.summary_host.slice(0, maxLengthOfTimeAndHostName).trim() + '+' // + means "..."
            : event.summary_host}`;
        const eventStartTimeAndHost = `${event.summary_start_time} ${host}`.padEnd(maxTimeAndHostLength, ' ');
        // two spaces between time/location and event title to make it more readable
        event.summary = `${eventStartTimeAndHost}  ${event.summary_event_title.trim()}`;
    }

    // Trim text, adding a "..." if trimmed
    for (let event of events) {
        if (event.summary.length > maxLettersOnScreen) {
            event.summary = event.summary.slice(0, maxLettersOnScreen - 1) + '+'; // + means "..."
        }
    }

    const maxSummaryLength = Math.max(...events.map(event => event.summary.length));
    for (let event of events) {
        // Pad the summary to the max length
        event.summary = event.summary.padEnd(maxSummaryLength, ' ');
    }
    return events;
}

async function loadEvents() {
    try {
        const response = await fetch(eventsFilename);
        if (!response.ok) throw new Error('Failed to load events.json');
        return await response.json();
    } catch (e) {
        console.error('Could not load events.json, using default events.', e);
        // fallback to existing events array if fetch fails
        return [];
    }
}

// Get current time
function getNow() {
    return new Date().getTime();
}

// Get next, upcoming events (not yet started events)
function getUpcomingEvents(events, nowTimestamp, count, lastEventIDInList = 0) {
    return events.filter(ev => ev.timestamp > nowTimestamp && ev.id > lastEventIDInList)
        .slice(0, count);
}

function createLine(event) {
    let container = document.getElementById('board-container');
    let details = document.createElement('details');
    let summary = document.createElement('summary');

    let flipRow = document.createElement('div');
    flipRow.classList.add('flip-row');

    for (let char of event.summary.toUpperCase()) {
        char = transformSpecialLetters(char);
        flipRow.appendChild(letterToSpanElementMap.get(char).cloneNode(true));
    }

    details.classList.add('event-details');
    details.dataset.eventId = event.id;
    details.dataset.startTime = event.timestamp;

    details.appendChild(summary);
    summary.appendChild(flipRow);
    container.appendChild(details);

    let columnsContainer = document.createElement('div');
    columnsContainer.classList.add('columns-container');

    let leftColumn = document.createElement('div');
    leftColumn.style.flex = '1';

    let rightColumn = document.createElement('div');
    rightColumn.style.flex = '1';

    columnsContainer.appendChild(leftColumn);
    columnsContainer.appendChild(rightColumn);
    details.appendChild(columnsContainer);

    let iframe = createIframe(event);
    leftColumn.appendChild(iframe);

    let description = getEventDescription(event);
    rightColumn.appendChild(description);
};

function getEventDescription(event) {
    let eventInfo = document.createElement('div');
    eventInfo.classList.add('event-description');
    
    let title = document.createElement('h2');
    title.textContent = event.event_title;
    eventInfo.appendChild(title);

    let category = document.createElement('p');
    category.classList.add('category');
    category.textContent = event.category_of_the_event;
    eventInfo.appendChild(category);

    let host = document.createElement('h3');
    host.innerHTML = event.host;
    eventInfo.appendChild(host);
    
    let location = document.createElement('p');
    location.classList.add('location');
    location.textContent = event.location_text;
    eventInfo.appendChild(location);

    let date = document.createElement('p');
    date.textContent = event.date + ' at ' + event.start_time + ' - ' + event.end_time;
    eventInfo.appendChild(date);

    let description = document.createElement('p');
    description.textContent = event.event_description;
    eventInfo.appendChild(description);

    let inclusionsConsiderations = createTheInclusionsList(event);
    eventInfo.appendChild(inclusionsConsiderations);
    return eventInfo;
}

function createTheInclusionsList(event)
{
    var ul = document.createElement('ul');

    if (event.kid_friendly == "TRUE") {
        var li = document.createElement('li');
        li.textContent = "🐵 Kid Friendly"
        ul.appendChild(li)
    }
    if (event.sex_positive == "TRUE") {
        var li = document.createElement('li');
        li.textContent = "🖤 Sex positive event"
        ul.appendChild(li)
    }
    if (event.queer_inclusive == "TRUE") {
        var li = document.createElement('li');
        li.textContent = "🌈 Queer-inclusive"
        ul.appendChild(li)
    }
    if (event.adult_only == "TRUE") {
        var li = document.createElement('li');
        li.textContent = "🦍 Adults only"
        ul.appendChild(li)
    }
    if (event.sober_only == "TRUE") {
        var li = document.createElement('li');
        li.textContent = "😇 Sober"
        ul.appendChild(li)
    }
    if (event.warning_sensory_content == "TRUE") {
        var li = document.createElement('li');
        li.textContent = "💥 Warning: Sensory content"
        ul.appendChild(li)
    }
    if (event.warning_triggering == "TRUE") {
        var li = document.createElement('li');
        li.textContent = "🚨 Warning: Triggering themes"
        ul.appendChild(li)
    }
    return ul;
}

function createIframe(event) {
    let iframeSrc = `/?cleanandquiet`;
    let locationFound = false;
    // if event.location_link is a url and has query string parameter "id", extract the id and create a link
    if (event.location_link && event.location_link.includes('id=')) {
        const url = new URL(event.location_link);
        const id = url.searchParams.get('id');
        if (id) {
            iframeSrc = iframeSrc +`&id=${id}`;
            locationFound = true;
        }
    } 
    // if the event.location_link matches the pattern coordinates "57.6255981690  14.9207532406" (with two spaces), create a link with coordinates
    else if (event.location_link && event.location_link.match(/^\d+\.\d+\s+ \d+\.\d+$/)) {
        const coords = event.location_link.split('  ');
        iframeSrc = iframeSrc +`&coordinates=${coords[0]}  ${coords[1]}`;
        locationFound = true;
    }
    // If no valid link is provided, return an empty div
    if (!locationFound) {
        let emptyDiv = document.createElement('div');
        emptyDiv.classList.add('empty-location');
        emptyDiv.textContent = 'No valid location link provided';
        return emptyDiv; // Return the empty div if no valid link is provided
    }

    let iframe = document.createElement('iframe');
    iframe.loading = 'lazy';
    iframe.src = iframeSrc;
    return iframe;
}

async function initialize() {
    document.getElementById('event-count').innerText = eventCountToShow;
    createMap();
    let events = await loadEvents();

    events = getUpcomingEvents(events, getNow(), eventCountToShow);
    events = createEventSummaryText(events);
    events.forEach(createLine)


    // Every 5 minutes, remove already started events and add new not yet started events at the bottom
    setInterval(async () => {
        const now = getNow();
        // Remove events that have already started
        const container = document.getElementById('board-container');
        const detailsElements = container.querySelectorAll('.event-details');
        const highestVisibleEventId = Number(detailsElements[detailsElements.length - 1].dataset.eventId);

        let counter = 0;
        detailsElements.forEach(details => {
            const startTime = new Date(Number(details.dataset.startTime));
            if (startTime <= now) {
                details.remove();
                counter++;
            }
        });

        // Load new events
        let newEvents = await loadEvents();
        newEvents = getUpcomingEvents(newEvents, now, counter, highestVisibleEventId);
        newEvents = createEventSummaryText(newEvents);
        newEvents.forEach(createLine);
    }, 1000 * 60 * 5); // 5 minutes in milliseconds
}

initialize();



