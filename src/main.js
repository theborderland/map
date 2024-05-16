import { createMap } from './map';
import { showDrawer } from './messages';

async function main() {
    // Create the map
    await createMap();

    // Only show message if user has not seen the welcome message yet
    if (!localStorage.getItem('hasSeenPlacementWelcome')) {
        showDrawer({
            file: 'welcome',
            onClose: () => {
                localStorage.setItem('hasSeenPlacementWelcome', 'true');
            },
        });
    }
}
main();
