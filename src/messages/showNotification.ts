const container = document.querySelector('.alert-toast-wrapper');

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

    // Wait for custom elements to be defined
    await Promise.allSettled([customElements.whenDefined('sl-alert')]);

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

// export const showBetaMsg = async () => {
//     return new Promise((resolve) => {
//         const instructions = document.getElementById('betaMsg');
//         if (instructions != null) {
//             //Show the instructions screen
//             instructions.removeAttribute('hidden');
//
//             //Add a close button
//             const nextButton = document.createElement('button');
//             //Center this button in its div
//             nextButton.style.margin = 'auto';
//             nextButton.style.display = 'block';
//             nextButton.innerHTML = 'Okidoki!';
//             nextButton.onclick = (e) => {
//                 instructions.setAttribute('hidden', '');
//                 resolve(true);
//             };
//             instructions.appendChild(nextButton);
//         } else {
//             resolve(true);
//         }
//     });
// };

// <!-- Instructions -->
// <div hidden class="hidden instructions" id="messages">
//     <h2 class="title">Welcome!</h2>
//     <p class="content">
//         <br /><br />
//         If this is your first time here, <a href="instructions/"><b>read the instructions</b></a>
//         to get to know the process!
//         <br /><br />
//         Otherwise, have fun, respect other peoples work and <b>remember to refresh the page</b> to see changes!
//     </p>
//     <div class="button"></div>
// </div>
// <div hidden class="instructions" id="editMsg">
//     <div id="pageOne">
//         <h2 style="margin-top: 0">Welcome!</h2>
//         <p>
//             You have now entered the edit mode for the placement process of The Borderland 2023. You have a lot
//             of power here, but with great power comes great responsibility! This is a co-created effort, so
//             please be respectful of other people's work and ideas. Do not delete or change anything that is not
//             yours, without asking first (Discord is the best way to do this). <br /><br />
//             If you questions or need support, please ask in
//             <a href="https://discord.com/channels/932714386286575736/1100734590370455563"
//                 >🚩Placement -> 🏴general</a
//             >.
//         </p>
//     </div>
//     <div hidden id="pageTwo">
//         <h2 style="margin-top: 0">Instructions</h2>
//         <p>
//             The main area for The Borderland 2023 is within the yellow border. Try to stay within that.<br /><br />
//             The system will warn you if you are breaking any rules, and will tell you all kinds of things along
//             the way. Try to fix as many issues as possible.<br /><br />
//             <a href="instructions/" target="_blank">Read more about placement instructions here.</a><br /><br />
//             <i
//                 ><b>IMPORTANT!</b> At the moment the page is not auto-reloading, so please refresh the page to
//                 see other peoples changes!</i
//             >
//         </p>
//     </div>
// </div>
