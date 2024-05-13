import { createMap } from './map';
//import { showBetaMsg } from './messages';

async function main() {
    createMap();

    //Only show message if user has not seen instructions yet
    if (!localStorage.getItem('hasSeenPlacementInstructions')) {
        //showBetaMsg();
    }
}
main();
