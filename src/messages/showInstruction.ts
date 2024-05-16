let onCloseResolve = null;
let onCloseAction = null;

type DrawerOptions = {
    file: string;
    onClose?: () => any;
    btn?: string;
};

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
    });
    btn.addEventListener('click', () => drawerElement.hide());

    resolve(drawerElement);
});

export async function showDrawers(options: Array<DrawerOptions>) {
    for (const option of options) {
        await showDrawer(option);
    }
}

export async function showDrawer(option: DrawerOptions) {
    return new Promise(async (resolve) => {
        onCloseAction = option.onClose || null;
        onCloseResolve = resolve;
        const drawer = await drawerLoader;
        const content = drawer.querySelector('.content');
        content.innerHTML = '';
        const res = await fetch(`/drawers/${option.file}.html`);
        const html = await res.text();

        // Content
        const cc = document.createElement('p');
        cc.innerHTML = html;
        content.appendChild(cc);

        // Button
        const btn = document.getElementById('drawer-button');
        if (option.btn) {
            btn.innerHTML = option.btn;
        } else {
            btn.innerHTML = 'Close';
        }

        drawer.show();
    });
}
