export async function showNotification(
    message: string,
    variant: 'primary' | 'success' | 'neutral' | 'warning' | 'danger' = 'primary',
    icon = 'info-circle',
    duration = 3000,
) {
    const alert: any = Object.assign(document.createElement('sl-alert'), {
        variant,
        closable: true,
        duration: duration,
        innerHTML: `
		<sl-icon name="${icon}" slot="icon"></sl-icon>
		${message}
	  `,
    });

    document.body.append(alert);
    // TODO : why does it not continue after this promise when no internet connection and sl-alert will not be devined?
    // It is awaitened so it should, right?
    // Wait for custom elements to be defined
    const timeout = new Promise(() => setTimeout(() => console.log('Timeout'), 1000));

    await Promise.race([customElements.whenDefined('sl-alert'), timeout]);

    alert.toast();
    return alert;
}

export async function updateNotification(
    alert: any,
    message: string,
    variant: 'primary' | 'success' | 'neutral' | 'warning' | 'danger' = 'primary',
    icon = 'info-circle',
    duration = 3000,
) {
    alert.innerHTML = `
		<sl-icon name="${icon}" slot="icon"></sl-icon>
		${message}
	  `;

    return alert;
}

export async function closeNotification(alert) {
    alert.hide();
}
