let drawerLoader = new Promise<any>(async (resolve) => {
    // Wait for custom elements to be defined
    await Promise.allSettled([customElements.whenDefined('sl-drawer')]);

    // Find the element
    const drawerElement: any = document.getElementById('drawer');

    drawerElement.addEventListener('sl-request-close', (event) => {
        if (event.detail.source === 'overlay') {
            event.preventDefault();
        }
    });

    resolve(drawerElement);
});

export async function showDrawer() {
    const drawer = await drawerLoader;
    drawer.show();
}
