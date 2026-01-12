import { hash } from '../utils';

let openedDrawer = null;
let onCloseResolve = null;
let onCloseAction = null;
let isDrawerLoading = false;

const DEFAULT_BUTTON: Button = {
    text: "Close",
    variant: "primary"
};

let drawerLoader = new Promise<any>(async (resolve) => {
    // Wait for custom elements to be defined
    await Promise.allSettled([customElements.whenDefined('sl-drawer')]);

    const drawerElement: any = document.getElementById('drawer');

    drawerElement.addEventListener('sl-request-close', (event) => {
        if (drawerElement.placement == 'end') {
            return;
        }
        if (event.detail.source === 'overlay') {
            event.preventDefault();
        }
    });

    drawerElement.addEventListener('sl-after-hide', (event) => {
        if (event.target !== drawerElement) {
            return;
        }

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
    // Prevent concurrent drawer loading
    if (isDrawerLoading) {
        return;
    }

    isDrawerLoading = true;

    try {
        return new Promise<void>(async (resolve) => {
            onCloseAction = drawerOptions.onClose || null;
            onCloseResolve = resolve;
            const drawer = await drawerLoader;
            drawer.placement = drawerOptions.position || 'bottom';
            const content = drawer.querySelector('.container');
            const buttonsContainer = drawer.querySelector("#buttons-container");
            const res = await fetch(`drawers/${drawerOptions.file}.html`);
            const html = await res.text();

            // NOTE: a last day hack
            if (drawerOptions.file.includes('home')) {
                drawerOptions.keepOpen = true;
            }

            content.innerHTML = html;
            buttonsContainer.innerHTML = ''; // Clear existing buttons
            // Add default button if no other buttons explicitly specified.
            drawerOptions.buttons ??= [DEFAULT_BUTTON];

            // Now with support for multiple buttons
            drawerOptions.buttons.forEach(button => {
                let btnElement = createAndAddButton(button, orderOptions, drawer, resolve);
                buttonsContainer.appendChild(btnElement);
            });

            hash.page = drawerOptions.file;
            openedDrawer = drawerOptions;
            drawer.show();
            onLoadedCallback();
            isDrawerLoading = false;
        });
    } catch (error) {
        isDrawerLoading = false;
        throw error;
    }
}

export async function hideDrawer() {
    const drawer = await drawerLoader;
    drawer.hide();
}

function createAndAddButton(
    button: Button,
    orderOptions: OrderOptions,
    drawer: any,
    resolve: () => void
): HTMLElement {
    const finalButton = configureButtonAction(button, orderOptions, resolve);
    const btnElement = createButtonElement(finalButton);
    const clickHandler = createClickHandler(finalButton, drawer);
    
    btnElement.addEventListener('click', clickHandler);
    return btnElement;
}

function configureButtonAction(
    button: Button,
    orderOptions: OrderOptions,
    resolve: () => void
): Button {
    const configuredButton = { ...button };

    if (orderOptions.keepOpen) {
        configuredButton.onClickAction = resolve;
    } else if (openedDrawer?.keepOpen) {
        // When we click on links that changes the hash, for example href="#page:guide-terms" in the guide.
        // we should store the last opened drawer and set the button to go back to it.
        const target = { ...openedDrawer };
        configuredButton.text = 'Back';
        configuredButton.shouldCloseDrawer = false;
        configuredButton.onClickAction = async () => {
            await showDrawer(target);
            resolve();
        };
    }

    return configuredButton;
}

function createButtonElement(button: Button): HTMLElement {
    const btn = document.createElement('sl-button');
    btn.innerText = button.text || DEFAULT_BUTTON.text;
    btn.setAttribute('variant', button.variant || DEFAULT_BUTTON.variant);
    return btn;
}

function createClickHandler(button: Button, drawer: any): () => void {
    return () => {
        if (button.onClickAction) {
            button.onClickAction();
            if (button.shouldCloseDrawer) {
                drawer.hide();
            }
        } else {
            drawer.hide();
        }
    };
}

type DrawerOptions = {
    file: string;
    position: 'end' | 'bottom' | 'start' | 'top'; // end = right, start = left
    /** Will only work on the last drawer if you're sending in multiple drawers. */
    onClose?: () => any;
    buttons?: Array<Button>;
    keepOpen?: boolean;
};

type OrderOptions = {
    keepOpen?: boolean;
};

type Button = {
    text: string;
    /**
     * If there is an onClickAction, the button will not close the drawer (otherwise it will).
     * To do so, you need to explicitly set the shouldCloseDrawer to true.
     */
    onClickAction?: () => any;
    variant?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral';
    shouldCloseDrawer?: boolean;
};
