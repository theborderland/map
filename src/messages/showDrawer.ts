import { hash } from '../utils';

let openedDrawer = null;
let onCloseResolve = null;
let onCloseAction = null;
let onBtnAction = null;

let drawerLoader = new Promise<any>(async (resolve) => {
    // Wait for custom elements to be defined
    await Promise.allSettled([customElements.whenDefined('sl-drawer')]);

    const drawerElement: any = document.getElementById('drawer');
    const btn = document.getElementById('drawer-button');

    drawerElement.addEventListener('sl-request-close', (event) => {
        if (drawerElement.placement == 'end') {
            return;
        }
        if (event.detail.source === 'overlay') {
            event.preventDefault();
        }
    });

    drawerElement.addEventListener('sl-after-hide', (event) => {
        if (onCloseAction) {
            onCloseAction();
        }
        if (onCloseResolve) {
            onCloseResolve();
        }
        if (openedDrawer) {
            openedDrawer = null;
        }
        hash.page = undefined;
    });
    btn.addEventListener('click', () => {
        if (onBtnAction) {
            onBtnAction();
        }
    });
    resolve(drawerElement);
});

export async function showDrawers(drawerOptions: Array<DrawerOptions>) {
    for (let i = 0; i < drawerOptions.length; i++) {
        const option = drawerOptions[i];
        if (i == drawerOptions.length - 1) {
            await showDrawer(option, { keepOpen: false });
        } else {
            await showDrawer(option, { keepOpen: true });
        }
    }
}

export async function showDrawer(
    drawerOptions: DrawerOptions, 
    orderOptions: OrderOptions = {}, 
    onLoadedCallback: () => any = () => {}
) {
    return new Promise<void>(async (resolve) => {
        onCloseAction = drawerOptions.onClose || null;
        onCloseResolve = resolve;
        onBtnAction = null;
        const drawer = await drawerLoader;
        drawer.placement = drawerOptions.position || 'bottom';
        const content = drawer.querySelector('.container');
        content.innerHTML = '';
        const res = await fetch(`drawers/${drawerOptions.file}.html`);
        const html = await res.text();

        // NOTE: a last day hack
        if (drawerOptions.file.indexOf('home') > -1) {
            drawerOptions.keepOpen = true;
        }

        // Content
        const cc = document.createElement('div');
        cc.innerHTML = html;
        for (const child of Array.from(cc.children)) {
            content.appendChild(child);
        }

        // Button
        const btn = document.getElementById('drawer-button');
        if (orderOptions.keepOpen) {
            btn.innerText = 'Continue';
            onBtnAction = resolve;
        } else {
            if (openedDrawer && openedDrawer.keepOpen) {
                const target = { ...openedDrawer };
                btn.innerText = 'Back';
                onBtnAction = async () => {
                    await showDrawer(target);
                    resolve();
                };
            } else {
                btn.innerText = drawerOptions.btnText || 'Close';
                onBtnAction = () => drawer.hide();
            }
        }
        if (drawerOptions.onBtnAction) {
            onBtnAction = () => {
                drawer.hide();
                drawerOptions.onBtnAction(); 
            };
        }

        hash.page = drawerOptions.file;
        openedDrawer = drawerOptions;
        drawer.show();
        onLoadedCallback();
    });
}

type DrawerOptions = {
    file: string;
    position: 'end' | 'bottom' | 'start' | 'top'; // end = right, start = left
    onBtnAction?: () => any;
    onClose?: () => any;
    btnText?: string;
    keepOpen?: boolean;
};

type OrderOptions = {
    keepOpen?: boolean;
};
