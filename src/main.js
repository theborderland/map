import { createMap } from './map';
import { createStats } from './stats';
import { showDrawers } from './messages';

/** Main method for index.html */
async function index() {
    // Create the map
    try {
        await createMap();
    } catch (err) {
        console.error(err);
    }

    // Only show message if user has not seen the welcome message yet
    if (!localStorage.getItem('hasSeenPlacementWelcome2025')) {
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
