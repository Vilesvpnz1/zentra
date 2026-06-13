        lucide.createIcons();

        window.panicUrl = localStorage.getItem('sb_panic') || 'https://www.google.com';
        window.autoPanic = localStorage.getItem('sb_autopanic') === 'true';

        window.updatePanicUrl = (url) => { window.panicUrl = url; localStorage.setItem('sb_panic', url); };
        window.updateAutoPanic = (val) => { window.autoPanic = val === 'true'; localStorage.setItem('sb_autopanic', window.autoPanic); };

        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.location.replace(window.panicUrl); });
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && window.autoPanic) window.location.replace(window.panicUrl); });

        const cloaks = {
            default: { title: "StudyZone - Middle School Learning", icon: "" },
            google: { title: "Google", icon: "https://www.google.com/favicon.ico" },
            drive: { title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
            ixl: { title: "IXL | Math, Language Arts, Science, Social Studies, and Spanish", icon: "https://www.ixl.com/ixl-favicon.png" },
            canvas: { title: "Dashboard", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" }
        };

        window.setCloak = (cloakId) => {
            const cloak = cloaks[cloakId] || cloaks.default;
            document.title = cloak.title;
            let link = document.querySelector("link[rel~='icon']");
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
            link.href = cloak.icon;
            localStorage.setItem('sb_cloak', cloakId);
        };

        window.openAboutBlank = () => {
            const win = window.open('about:blank', '_blank');
            if (win) {
                win.document.write(`<iframe src="${window.location.href}" style="border:none;width:100vw;height:100vh;margin:0;padding:0;"></iframe>`);
                win.document.body.style.margin = '0';
                window.location.replace(window.panicUrl);
            } else { alert('Popup blocker prevented opening about:blank'); }
        };

        const themes = {
           blue: { name: 'Ocean Blue', accent: '#00d2ff', dark: '#0077ff', bgDeep: '#000814', bgLight: '#001f3f', sidebarBg: 'rgba(0, 8, 20, 0.85)', textMuted: '#6b8cae' },
        purple: { name: 'Neon Purple', accent: '#d500ff', dark: '#7b00ff', bgDeep: '#0d0014', bgLight: '#2b004d', sidebarBg: 'rgba(13, 0, 20, 0.85)', textMuted: '#a37ec4' },
        red: { name: 'Crimson Red', accent: '#ff3333', dark: '#b30000', bgDeep: '#140000', bgLight: '#3d0000', sidebarBg: 'rgba(20, 0, 0, 0.85)', textMuted: '#c47e7e' },
        green: { name: 'Forest Green', accent: '#00ff88', dark: '#00aa55', bgDeep: '#001408', bgLight: '#003617', sidebarBg: 'rgba(0, 20, 8, 0.85)', textMuted: '#67a886' },
        orange: { name: 'Sunset Orange', accent: '#ff9900', dark: '#cc5500', bgDeep: '#1a0800', bgLight: '#3d1400', sidebarBg: 'rgba(26, 8, 0, 0.85)', textMuted: '#ba8c6c' },
        pink: { name: 'Sakura Pink', accent: '#ff99cc', dark: '#cc0066', bgDeep: '#1a000d', bgLight: '#4d0026', sidebarBg: 'rgba(26, 0, 13, 0.85)', textMuted: '#c989a9' },
        dark: { name: 'Midnight Dark', accent: '#aaaaaa', dark: '#555555', bgDeep: '#050505', bgLight: '#1a1a1a', sidebarBg: 'rgba(5, 5, 5, 0.85)', textMuted: '#888888' },
        yellow: { name: 'Midnight Lemon', accent: '#FDE047', dark: '#CA8A04', bgDeep: '#050505', bgLight: '#1a1a17', sidebarBg: 'rgba(5, 5, 5, 0.85)', textMuted: '#8a8a82' },
        white: { name: 'AMOLED Dark', accent: '#aaaaaa', dark: '#555555', bgDeep: '#000000', bgLight: '#111111', sidebarBg: 'rgba(0, 0, 0, 0.85)', textMuted: '#777777' }

         }

        let currentThemeKey = localStorage.getItem("selectedTheme") || 'blue';
        let isThemeAnimating = false;

        function applyThemeStyles(theme) {
            const root = document.documentElement;
            root.style.setProperty('--accent', theme.accent);
            root.style.setProperty('--accent-dark', theme.dark);
            root.style.setProperty('--bg-deep', theme.bgDeep);
            root.style.setProperty('--bg-light', theme.bgLight);
            root.style.setProperty('--sidebar-bg', theme.sidebarBg);
            root.style.setProperty('--text-muted', theme.textMuted);
        }

        document.addEventListener('DOMContentLoaded', () => {
            const themeGridContainer = document.getElementById('themeGridContainer');
            const startupThemeGrid = document.getElementById('startupThemeGrid');

            for (const [key, theme] of Object.entries(themes)) {
                let btn = document.createElement('button');
                btn.className = `theme-preview-btn ${key === currentThemeKey ? 'active' : ''}`;
                btn.onclick = () => window.triggerThemeWave(key, btn);
                btn.title = theme.name;
                let swatch = document.createElement('div');
                swatch.className = 'theme-color-swatch';
                swatch.style.background = `linear-gradient(135deg, ${theme.accent}, ${theme.dark})`;
                btn.appendChild(swatch);
                themeGridContainer.appendChild(btn);

                let sBtn = document.createElement('button');
                sBtn.className = `theme-preview-btn ${key === currentThemeKey ? 'active' : ''}`;
                sBtn.title = theme.name;
                sBtn.onclick = () => {
                    document.getElementById('startupSelectedTheme').value = key;
                    startupThemeGrid.querySelectorAll('.theme-preview-btn').forEach(b => b.classList.remove('active'));
                    sBtn.classList.add('active');
                };
                let sSwatch = document.createElement('div');
                sSwatch.className = 'theme-color-swatch';
                sSwatch.style.background = `linear-gradient(135deg, ${theme.accent}, ${theme.dark})`;
                sBtn.appendChild(sSwatch);
                startupThemeGrid.appendChild(sBtn);
            }

            if(themes[currentThemeKey]) applyThemeStyles(themes[currentThemeKey]);
            
            if (localStorage.getItem('sb_cloak')) {
                document.getElementById('cloakSelect').value = localStorage.getItem('sb_cloak');
                document.getElementById('startupCloakSelect').value = localStorage.getItem('sb_cloak');
                window.setCloak(localStorage.getItem('sb_cloak'));
            }
            if (localStorage.getItem('sb_name')) {
                document.getElementById('brandTextDisplay').innerText = localStorage.getItem('sb_name');
                document.getElementById('userName').value = localStorage.getItem('sb_name');
            }
            if (localStorage.getItem('sb_panic')) document.getElementById('panicUrlInput').value = localStorage.getItem('sb_panic');
            if (localStorage.getItem('sb_autopanic')) document.getElementById('autoPanicSelect').value = localStorage.getItem('sb_autopanic');
            
            if (localStorage.getItem('sb_device') === 'mobile' || (window.innerWidth <= 768 && !localStorage.getItem('seaBeanStartupDone'))) {
                document.body.classList.add('mobile-mode');
                selectDevice('mobile', document.querySelectorAll('.device-btn')[1]);
            }

            setTimeout(() => {
                const decoy = document.getElementById('studyzone-decoy');
                decoy.style.opacity = '0';
                setTimeout(() => {
                    decoy.style.display = 'none';
                    document.title = cloaks[localStorage.getItem('sb_cloak') || 'default'].title; 
                    if (localStorage.getItem('seaBeanStartupDone') === 'true') {
                        if (localStorage.getItem('seaBeanUpdateSeen') !== 'true') {
                            document.getElementById('themeAnnouncementOverlay').classList.add('show');
                            localStorage.setItem('seaBeanUpdateSeen', 'true');
                        }
                    } else {
                        document.getElementById('startupOverlay').classList.add('show');
                    }
                }, 500);
            }, 10);
        });

        window.triggerThemeWave = function(themeKey, clickedBtn) {
            if ((themeKey === currentThemeKey && clickedBtn) || isThemeAnimating) return; 
            const theme = themes[themeKey];
            if (!theme) return;

            isThemeAnimating = true;
            document.querySelectorAll('#themeGridContainer .theme-preview-btn').forEach(b => b.classList.remove('active'));
            if(clickedBtn) {
                clickedBtn.classList.add('active');
            } else {
                const buttons = document.querySelectorAll('#themeGridContainer .theme-preview-btn');
                const index = Object.keys(themes).indexOf(themeKey);
                if(buttons[index]) buttons[index].classList.add('active');
            }

            document.getElementById('settingsOverlay').classList.remove('show'); 
            const waveFill = document.getElementById("themeWaveFill");
            const parallaxGroup = document.getElementById("transitionWaveGroup");

            waveFill.style.background = theme.bgDeep;
            if (parallaxGroup) {
                parallaxGroup.innerHTML = `
                    <use href="#theme-gentle-wave" x="48" y="0" fill="${theme.accent}" opacity="0.5" />
                    <use href="#theme-gentle-wave" x="48" y="3" fill="${theme.accent}" opacity="0.7" />
                    <use href="#theme-gentle-wave" x="48" y="5" fill="${theme.dark}" opacity="0.9" />
                    <use href="#theme-gentle-wave" x="48" y="7" fill="${theme.bgDeep}" />
                `;
            }

            void waveFill.offsetWidth; 
            waveFill.classList.add('active');

            setTimeout(() => {
                applyThemeStyles(theme);
                localStorage.setItem("selectedTheme", themeKey);
                currentThemeKey = themeKey;
                
                const iframe = document.getElementById("mainFrame");
                if (iframe && iframe.src) {
                    iframe.style.opacity = '0';
                    setTimeout(() => { iframe.src = iframe.src; iframe.onload = () => iframe.style.opacity = '1'; }, 50);
                }
                
                setTimeout(() => {
                    waveFill.classList.remove('active');
                    setTimeout(() => { isThemeAnimating = false; }, 800);
                }, 400); 
            }, 800);
        };

        function selectDevice(type, element) {
            document.querySelectorAll('.device-btn').forEach(btn => btn.classList.remove('active'));
            element.classList.add('active');
            document.getElementById('deviceSelection').value = type;
        }

        function finishStartup() {
            const userName = document.getElementById('userName').value.trim();
            const cloakSelect = document.getElementById('startupCloakSelect').value;
            const deviceMode = document.getElementById('deviceSelection').value;
            const themeKey = document.getElementById('startupSelectedTheme').value;

            if (userName) { document.getElementById('brandTextDisplay').innerText = userName; localStorage.setItem('sb_name', userName); }
            if (cloakSelect && window.setCloak) { window.setCloak(cloakSelect); document.getElementById('cloakSelect').value = cloakSelect; }
            if (deviceMode === 'mobile') document.body.classList.add('mobile-mode');
            else document.body.classList.remove('mobile-mode');
            
            localStorage.setItem('sb_device', deviceMode);
            localStorage.setItem('seaBeanStartupDone', 'true');
            localStorage.setItem('seaBeanUpdateSeen', 'true'); 

            document.getElementById('startupOverlay').classList.remove('show');
            window.triggerThemeWave(themeKey);
        }

        function handleSidebarHover(isEntering) {
            if (document.body.classList.contains('mobile-mode')) return;
            const sidebar = document.getElementById('sidebar');
            const iframeWrap = document.getElementById('iframe-wrapper');
            if (isEntering) { sidebar.classList.add('expanded'); iframeWrap.classList.add('blurred'); } 
            else { sidebar.classList.remove('expanded'); iframeWrap.classList.remove('blurred'); }
        }
        
        window.openSidebar = () => handleSidebarHover(true);
        window.closeSidebar = () => handleSidebarHover(false);

        function openSettings() { closeSidebar(); document.getElementById('settingsOverlay').classList.add('show'); }
        function closeSettings(e) { if (e.target.id === 'settingsOverlay') document.getElementById('settingsOverlay').classList.remove('show'); }

        let isPageLoading = false;
        function loadPage(url, title, element) {
            if (isPageLoading) return;
            isPageLoading = true;

            closeSidebar();
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            if(element) element.classList.add('active');

            const waveFill = document.getElementById("loaderWaveFill");
            const text = document.getElementById("loadingText");
            const iframe = document.getElementById("mainFrame");
            
            void waveFill.offsetWidth;
            waveFill.classList.add('active');
            text.classList.add('active');

            setTimeout(() => {
                iframe.style.opacity = '0'; 
                setTimeout(() => {
                    iframe.src = url;
                    iframe.onload = () => { iframe.style.opacity = '1'; };
                    
                    waveFill.classList.remove('active');
                    text.classList.remove('active');

                    setTimeout(() => { isPageLoading = false; }, 1500); 
                }, 100); 
            }, 1500); 
        }

        function closeAnnouncement() { document.getElementById('themeAnnouncementOverlay').classList.remove('show'); }
        function closeAd() { document.getElementById('ad-container').classList.add('slide-out'); }
        
        function toggleMasterAds(checkbox) {
            const adContainer = document.getElementById('ad-container');
            if (checkbox.checked) { adContainer.style.display = 'flex'; setTimeout(() => adContainer.classList.remove('slide-out'), 10); } 
            else { adContainer.style.display = 'none'; }
        }
        function toggleTurboAds(checkbox) {
            const turboContainer = document.getElementById('turbo-ad-container');
            if (checkbox.checked) {
                turboContainer.innerHTML = '<div id="container-d86ba687c26fa8d5d6f109ee0bb1a5cc"></div>';
                let script1 = document.createElement('script'); script1.async = true; script1.dataset.cfasync = "false";
                script1.src = "/";
                turboContainer.appendChild(script1);
                let script2 = document.createElement('script'); script2.src = "/"; script2.id = "turbo-script-2";
                document.body.appendChild(script2);
            } else {
                turboContainer.innerHTML = '';
                let s2 = document.getElementById('turbo-script-2'); if(s2) s2.remove();
            }
        }
