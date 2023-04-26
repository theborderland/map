export const showBetaMsg = async () => {
    return new Promise((resolve) => {
            const instructions = document.getElementById("betaMsg");
            console.log(instructions);
            if (instructions != null)
            {
                //Show the instructions screen
                instructions.removeAttribute("hidden");   
                
                //Add a close button
                const nextButton = document.createElement('button');
                //Center this button in its div
                nextButton.style.margin = "auto";
                nextButton.style.display = "block";
                nextButton.innerHTML = 'Okidoki!';
                nextButton.onclick = (e) => {
                    instructions.setAttribute("hidden", "");
                    resolve(true);
                };
                instructions.appendChild(nextButton);
            }
            else {
                resolve(true);
            }
        });
};
