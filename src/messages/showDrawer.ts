import { hash } from '../utils';

let onCloseResolve = null;
let onCloseAction = null;
let onBtnAction = null;

let drawerLoader = new Promise<any>(async (resolve) => {
    // Wait for custom elements to be defined
    await Promise.allSettled([customElements.whenDefined('sl-drawer')]);

    const drawerElement: any = document.getElementById('drawer');
    const btn = document.getElementById('drawer-button');

    drawerElement.addEventListener('sl-request-close', (event) => {
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

export async function showDrawer(drawerOptions: DrawerOptions, orderOptions: OrderOptions = {}) {
    return new Promise(async (resolve) => {
        onCloseAction = drawerOptions.onClose || null;
        onCloseResolve = resolve;
        onBtnAction = null;
        const drawer = await drawerLoader;
        drawer.placement = drawerOptions.position || 'bottom';
        const content = drawer.querySelector('.content');
        content.innerHTML = '';
        const res = await fetch(`/drawers/${drawerOptions.file}.html`);
        const html = await res.text();

        // Content
        const cc = document.createElement('p');
        cc.innerHTML = html;
        content.appendChild(cc);

        // Button
        const btn = document.getElementById('drawer-button');
        if (orderOptions.keepOpen) {
            btn.innerHTML = 'Continue';
            onBtnAction = resolve;
        } else {
            btn.innerHTML = 'Close';
            onBtnAction = () => drawer.hide();
        }
        if (drawerOptions.btn) {
            btn.innerHTML = drawerOptions.btn;
        }

        hash.page = drawerOptions.file;
        drawer.show();
    });
}

type DrawerOptions = {
    file: string;
    position: 'end' | 'bottom' | 'start' | 'top';
    onClose?: () => any;
    btn?: string;
};

type OrderOptions = {
    keepOpen?: boolean;
};
