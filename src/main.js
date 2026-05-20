import { createMap } from './map';
import { createStats } from './stats';
import { showDrawers } from './messages';
import { HAS_SEEN_PLACEMENT_WELCOME_COOKIE_KEY, SOUND_GUIDE_URL } from '../SETTINGS';
import { setCookie, getCookie } from "./utils/cookie";

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
        var map = await createMap(_isCleanAndQuietMode);
        window.toggleLayerByName = map.toggleLayerByName;
    } catch (err) {
        console.error(err);
    }

    // Only show message if user has not seen the welcome message yet
    if (getCookie(HAS_SEEN_PLACEMENT_WELCOME_COOKIE_KEY) == null && !_isCleanAndQuietMode) {
        showDrawers([{
            file: 'welcome',
            position: 'bottom',
            buttons: [{ text: 'Continue' }]
        }, {
            file: 'preplacement',
            position: 'bottom',
            onClose: () => {
                setCookie(HAS_SEEN_PLACEMENT_WELCOME_COOKIE_KEY, 'true', 60);
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

window.GetSoundGuideUrl = function () {
    return SOUND_GUIDE_URL;
};