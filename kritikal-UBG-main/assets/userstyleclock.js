        let timeOffset = 0;
        let isIPTime = false;

        async function fetchIPTime() {
            try {
                const response = await fetch('https://worldtimeapi.org/api/ip');
                const data = await response.json();
                const serverTime = new Date(data.datetime);
                timeOffset = serverTime - new Date();
                isIPTime = true;
                document.getElementById('source-tag').textContent = "Network Sync";
            } catch (err) {
                document.getElementById('source-tag').textContent = "System Local";
            }
        }

        function updateClock() {
            let now = new Date();
            
           
            if (isNaN(now.getTime())) {
                fetchIPTime();
            }

        
            if (isIPTime) {
                now = new Date(Date.now() + timeOffset);
            }

            
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        
            document.getElementById('time-display').textContent = `${hours}:${minutes}`;
            document.getElementById('seconds-display').textContent = seconds;
            document.getElementById('date-display').textContent = dateStr;
        }

        
        setInterval(updateClock, 1000);
        updateClock();
