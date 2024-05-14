import { createMap } from './map';
import { showNotification, updateNotification, closeNotification } from './messages';

async function main() {
    // const a = await showNotification('Test');
    // console.log('here', a);
    // setTimeout(() => {
    //     updateNotification(a, 'lololol');
    // }, 2000);
    // setTimeout(() => {
    //     closeNotification(a);
    // }, 5000);

    // Create the map
    createMap();

    //Only show message if user has not seen instructions yet
    if (!localStorage.getItem('hasSeenPlacementInstructions')) {
        //showBetaMsg();
    }
}
main();
