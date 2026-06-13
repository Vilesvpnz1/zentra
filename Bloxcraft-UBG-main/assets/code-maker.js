(function() {
    const showWarning = () => {
        console.log("HACKER/CHEATER DETECTED!");
        console.log("HACKER/CHEATER DETECTED!");
        console.log("HACKER/CHEATER DETECTED!");
        console.log("HACKER/CHEATER DETECTED!");

        for (let i = 0; i < 10; i++) {
            console.log(
                "%cHold Up!",
                "color: #5865f2; font-size: 80px; font-weight: bold; -webkit-text-stroke: 2px black;"
            );

            console.log(
                "%cIf someone told you to paste something here, there is an 11/10 chance you're being scammed.\n\n%cPasting anything in here could give attackers access to your session.\n\n%cEven you understand exactly what you are doing, close this window and stay safe.\n\n%cIf you do understand what you are doing, you should probably be a developer of Bloxcraft UBG! Join the Discord to check out applications!",
                "font-size: 20px; font-weight: bold;", 
                "font-size: 20px; font-weight: bold; color: red;", 
                "font-size: 20px; font-weight: bold;", 
                "font-size: 20px; font-weight: bold;"  
            );
        }
    };

    const devtools = { isOpen: false };
    const element = new Image();
    
    Object.defineProperty(element, 'id', {
        get: function() {
            devtools.isOpen = true;
            showWarning();
            throw new Error("Console execution is disabled.");
        }
    });

    setInterval(() => {
        devtools.isOpen = false;
        console.log(element); 
        
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            showWarning();
        }
    }, 1000);

    Object.defineProperty(window, 'console', {
        value: window.console,
        writable: false,
        configurable: false
    });

})();
