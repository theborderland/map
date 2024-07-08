import { createMap } from './map';
import { createStats } from './stats';
import { showDrawer } from './messages';

/** Main method for index.html */
async function index() {
    // Create the map
    try {
        await createMap();
    } catch (err) {
        console.error(err);
    }

    // Only show message if user has not seen the welcome message yet
    if (!localStorage.getItem('hasSeenPlacementWelcome')) {
        showDrawer({
            file: 'welcome',
            position: 'bottom',
            onClose: () => {
                localStorage.setItem('hasSeenPlacementWelcome', 'true');
            },
        });
    }
}
window.indexMain = index;

/** Main method for stats.html */
async function stats() {
    await createStats();
}
window.statsMain = stats;
