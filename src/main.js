import { createMap } from './map';
import { createStats } from './stats';
import { showDrawers } from './messages';

/** Main method for index.html */
async function index() {
    /* 
        When this query parameter is set, the map will
        - not display any buttons or messages,
        - not check entity rules
        - disable camp popup on click
        - disable links in POI
    */
    const urlParams = new URLSearchParams(window.location.search);
    let _isCleanAndQuietMode = urlParams.has('cleanandquiet');
    // Create the map
    try {
        await createMap(_isCleanAndQuietMode);
    } catch (err) {
        console.error(err);
    }

    // Only show message if user has not seen the welcome message yet
    if (!localStorage.getItem('hasSeenPlacementWelcome2025') && !_isCleanAndQuietMode) {
        showDrawers([{
            file: 'welcome',
            position: 'bottom',
            buttons: [{text: 'Continue'}]
        },{
            file: 'preplacement',
            position: 'bottom',
            onClose: () => {
                localStorage.setItem('hasSeenPlacementWelcome2025', 'true');
            },
        }]);
    }
}
window.indexMain = index;

/** Main method for stats.html */
async function stats() {
    await createStats();
}
window.statsMain = stats;
