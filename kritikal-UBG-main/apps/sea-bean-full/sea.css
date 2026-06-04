       #studyzone-decoy {
            position: fixed; inset: 0; z-index: 9999999; 
            background: #e0e0e0; color: #222;
            font-family: Verdana, Arial, sans-serif; font-size: 12px;
            overflow-y: auto; transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        #studyzone-decoy * { margin: 0; padding: 0; box-sizing: border-box; }
        #studyzone-decoy #wrapper { width: 900px; margin: 15px auto; background: #fff; border: 1px solid #999; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        #studyzone-decoy #header { background: #003d7a; padding: 25px; border-bottom: 4px solid #002855; }
        #studyzone-decoy #header h1 { color: #fff; font-size: 32px; margin-bottom: 5px; }
        #studyzone-decoy #header p { color: #99ccff; font-size: 13px; }
        #studyzone-decoy #nav { background: #0066cc; overflow: hidden; }
        #studyzone-decoy #nav a { float: left; color: #fff; padding: 10px 20px; text-decoration: none; border-right: 1px solid #0052a3; font-size: 11px; font-weight: bold; }
        #studyzone-decoy #nav a:hover { background: #0052a3; }
        #studyzone-decoy #main { overflow: hidden; }
        #studyzone-decoy #sidebar-school { float: left; width: 200px; background: #f7f7f7; border-right: 1px solid #ccc; padding: 15px; }
        #studyzone-decoy #sidebar-school h3 { background: #003d7a; color: #fff; padding: 6px 8px; font-size: 12px; margin: -15px -15px 12px -15px; }
        #studyzone-decoy #sidebar-school ul { list-style: none; margin-bottom: 20px; }
        #studyzone-decoy #sidebar-school li { padding: 5px 0; border-bottom: 1px solid #ddd; }
        #studyzone-decoy #sidebar-school a { color: #0066cc; text-decoration: none; font-size: 11px; }
        #studyzone-decoy #sidebar-school a:hover { text-decoration: underline; }
        #studyzone-decoy #content-school { float: left; width: 685px; padding: 20px; }
        #studyzone-decoy #content-school h2 { color: #003d7a; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #0066cc; padding-bottom: 5px; }
        #studyzone-decoy #content-school p { line-height: 1.6; margin-bottom: 12px; }
        #studyzone-decoy .box { background: #f9f9f9; border: 1px solid #ccc; padding: 12px; margin-bottom: 15px; }
        #studyzone-decoy .box h3 { color: #003d7a; font-size: 14px; margin-bottom: 8px; }
        #studyzone-decoy .btn { background: #0066cc; color: #fff; padding: 6px 15px; text-decoration: none; font-size: 11px; font-weight: bold; display: inline-block; border: 1px solid #0052a3; }
        #studyzone-decoy .btn:hover { background: #0052a3; }
        #studyzone-decoy .alert { background: #ffffcc; border: 1px solid #ffcc00; padding: 10px; margin-bottom: 15px; font-size: 11px; }
        #studyzone-decoy .alert strong { color: #cc6600; }
        #studyzone-decoy #footer { clear: both; background: #003d7a; color: #99ccff; text-align: center; padding: 12px; font-size: 10px; border-top: 4px solid #002855; }
        #studyzone-decoy table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        #studyzone-decoy table td { padding: 8px; border: 1px solid #ccc; background: #f9f9f9; }
        #studyzone-decoy table td strong { color: #003d7a; }

        :root { 
            --accent: #00d2ff; 
            --accent-dark: #0077ff;
            --bg-deep: #000814; 
            --bg-light: #001f3f; 
            --sidebar-bg: rgba(0, 8, 20, 0.85); 
            --text-heading: #d4d4d8; 
            --text-main: #a1a1aa; 
            --text-muted: #6b8cae; 
            --sidebar-w-expanded: 260px;
            --sidebar-w-collapsed: 85px;
            --glass-border: rgba(255,255,255,0.08); 
            --anim-snappy: 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            --anim-smooth: 0.8s cubic-bezier(0.65, 0, 0.35, 1);
        }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: var(--bg-deep); }
        ::-webkit-scrollbar-thumb { background: var(--bg-light); border-radius: 8px; border: 2px solid var(--bg-deep); transition: background 0.3s ease; }
        ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

        html, body {
            background-color: var(--bg-deep) !important;
            margin: 0; padding: 0;
            height: 100vh; width: 100vw;
            overflow: hidden;
            font-family: 'Inter', -apple-system, sans-serif;
            color: var(--text-main);
            display: flex;
            box-sizing: border-box;
            transition: background-color var(--anim-smooth);
        }
        
        *, *::before, *::after { box-sizing: inherit; }

        body::after {
            content: ''; position: fixed; inset: 0; z-index: -1;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
            background-size: 40px 40px;
            mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
            -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
            opacity: 0.7;
        }

        #sidebar {
            width: var(--sidebar-w-collapsed);
            height: 100vh;
            background: var(--sidebar-bg);
            border-right: 1px solid var(--glass-border);
            display: flex; flex-direction: column; z-index: 20;
            transition: width var(--anim-snappy), background-color var(--anim-smooth), border-color var(--anim-smooth);
            overflow: hidden; will-change: width;
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }

        #sidebar.expanded { width: var(--sidebar-w-expanded); box-shadow: 10px 0 40px rgba(0, 0, 0, 0.6); }

        .sidebar-inner {
            display: flex; flex-direction: column; height: 100%;
            overflow-y: auto; overflow-x: hidden; padding: 25px 0;
        }
        .sidebar-inner::-webkit-scrollbar { display: none; }

        .sidebar-brand { display: flex; align-items: center; justify-content: flex-start; margin: 0 12px 30px 12px; height: 44px; white-space: nowrap; }
        .brand-icon-wrapper { width: 61px; min-width: 61px; display: flex; align-items: center; justify-content: center; }
        .brand-icon {
            width: 42px; height: 42px; background: var(--bg-light); border: 1px solid var(--glass-border);
            border-radius: 12px; display: flex; align-items: center; justify-content: center;
            transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background-color var(--anim-smooth), border-color var(--anim-smooth);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        #sidebar.expanded .brand-icon { transform: rotate(360deg) scale(1.05); border-color: var(--accent); background: var(--bg-deep); }
        .brand-icon .lucide { color: var(--accent); width: 22px; height: 22px; transition: transform var(--anim-snappy), color var(--anim-smooth);}

        .brand-text {
            margin-left: 8px; font-size: 19px; font-weight: 700; color: var(--text-heading);
            letter-spacing: 1.5px; text-transform: uppercase;
            opacity: 0; transition: opacity 0.3s ease, transform var(--anim-snappy);
            transform: translateX(-15px);
        }
        #sidebar.expanded .brand-text { opacity: 1; transform: translateX(0); }

        .nav-item {
            display: flex; align-items: center; justify-content: flex-start;
            margin: 4px 12px; width: calc(100% - 24px); height: 48px;
            border-radius: 12px; color: var(--text-muted);
            text-decoration: none; font-size: 14.5px; font-weight: 500;
            cursor: pointer; background: transparent; border: 1px solid transparent;
            transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); white-space: nowrap;
            position: relative; overflow: hidden;
        }

        .icon-container { width: 61px; min-width: 61px; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 2; }
        .nav-item .lucide, .nav-item .custom-icon { width: 20px; height: 20px; color: var(--text-muted); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .nav-text { margin-left: 6px; opacity: 0; transition: all 0.3s ease; margin-top: 2px; transform: translateX(-10px); z-index: 2; }
        
        #sidebar.expanded .nav-text { opacity: 1; transform: translateX(0); }
        .nav-item:hover { color: var(--text-heading); background: var(--bg-light); transform: translateX(4px); border-color: var(--glass-border);}
        .nav-item:hover .lucide, .nav-item:hover .custom-icon { color: var(--text-heading); transform: scale(1.15); }
        
        .nav-item.active { color: var(--text-heading); background: var(--bg-light); border: 1px solid var(--glass-border); box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .nav-item.active .lucide, .nav-item.active .custom-icon { color: var(--accent); transform: scale(1.2); }

        .sidebar-footer { border-top: 1px solid var(--glass-border); padding-top: 15px; margin-top: 15px; transition: border-color var(--anim-smooth); }

        body.mobile-mode { flex-direction: column-reverse; }
        body.mobile-mode #sidebar { width: 100% !important; height: 75px; min-height: 75px; border-right: none; border-top: 1px solid var(--glass-border); flex-direction: row; padding: 0; z-index: 100; box-shadow: 0 -10px 40px rgba(0,0,0,0.6); }
        body.mobile-mode .sidebar-inner { flex-direction: row; padding: 0 15px; width: 100%; justify-content: space-around; align-items: center; overflow: visible; }
        body.mobile-mode .sidebar-brand, body.mobile-mode .nav-text, body.mobile-mode .sidebar-footer { display: none; }
        body.mobile-mode .nav-item { width: 50px; height: 50px; margin: 0; border-radius: 14px; justify-content: center; transform: none !important; }
        body.mobile-mode .icon-container { width: 100%; min-width: unset; }
        body.mobile-mode #content-area { height: calc(100vh - 75px); padding: 10px; }
        body.mobile-mode #iframe-wrapper { border-radius: 20px; }

        #content-area { flex: 1; height: 100vh; position: relative; overflow: hidden; padding: 20px; box-sizing: border-box; transition: padding var(--anim-snappy); }
        #iframe-wrapper { width: 100%; height: 100%; border-radius: 24px; overflow: hidden; border: 1px solid var(--glass-border); position: relative; transition: filter var(--anim-smooth), transform var(--anim-snappy), border-radius var(--anim-snappy), box-shadow var(--anim-snappy), border-color var(--anim-smooth); will-change: filter, transform; background: var(--bg-deep); box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        #iframe-wrapper.blurred { filter: brightness(0.3) blur(8px); pointer-events: none; transform: scale(0.985); }
        #mainFrame { width: 100%; height: 100%; border: none; background: transparent; display: block; transition: opacity 0.4s ease;}

        .modal-overlay {
            position: fixed; inset: 0; 
            background: rgba(0, 0, 0, 0.7); 
            display: flex; align-items: center; justify-content: center; 
            z-index: 5000; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); 
            opacity: 0; pointer-events: none; transition: opacity 0.4s ease;
        }
        .modal-overlay.show { opacity: 1; pointer-events: auto; }
        
        #startupOverlay { z-index: 6000; background: var(--bg-deep); backdrop-filter: none; transition: background-color var(--anim-smooth), opacity 0.6s ease; }

        .modal-content {
            background: var(--bg-deep); border: 1px solid var(--glass-border); border-radius: 24px;
            padding: 35px 40px; width: 480px; max-height: 85vh; overflow-y: auto;
            box-shadow: 0 25px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05); 
            display: flex; flex-direction: column; 
            transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            transform: scale(0.9) translateY(20px); opacity: 0;
        }
        .modal-overlay.show .modal-content { transform: scale(1) translateY(0); opacity: 1; }
        
        .startup-modal { width: 440px; gap: 20px; }
        .startup-modal h2 { margin: 0 0 5px 0; color: var(--text-heading); font-size: 28px; text-align: center; font-weight: 700; letter-spacing: -0.5px;}
        .startup-modal p.subtitle { color: var(--text-muted); text-align: center; margin: 0 0 15px 0; font-size: 15px;}

        .settings-header, .announcement-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 20px; margin-bottom: 25px; transition: border-color var(--anim-smooth);}
        .settings-header h2, .announcement-header { margin: 0; color: var(--text-heading); font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
        .settings-header h2 .lucide, .announcement-header .lucide { width: 22px; height: 22px; color: var(--accent); flex-shrink: 0; transition: color var(--anim-smooth);}
        
        .close-btn { background: var(--bg-light); border: 1px solid var(--glass-border); color: var(--text-muted); border-radius: 12px; width: 36px; height: 36px; flex-shrink: 0; cursor: pointer; transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); padding: 0; display: flex; align-items: center; justify-content: center; }
        .close-btn .lucide { width: 16px; height: 16px; transition: transform 0.2s ease;}
        .close-btn:hover { background: var(--glass-border); color: var(--text-heading); transform: scale(1.05); }
        .close-btn:hover .lucide { transform: rotate(90deg); }

        .settings-section-title { font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1.5px; margin-bottom: 15px; font-weight: 700; display: flex; align-items: center; gap: 10px; margin-top: 25px; }
        .settings-section-title::after { content: ''; flex: 1; height: 1px; background: var(--glass-border); transition: background-color var(--anim-smooth);}
        .settings-section-title:first-of-type { margin-top: 0; }
        .settings-section-title .lucide { width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0;}

        .device-toggle { display: flex; gap: 12px; margin-top: 5px; }
        .device-btn { flex: 1; padding: 16px; background: var(--bg-deep); border: 2px solid var(--glass-border); border-radius: 16px; color: var(--text-muted); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; transition: all var(--anim-snappy); position: relative; overflow: hidden; }
        .device-btn .lucide { width: 28px; height: 28px; transition: transform var(--anim-snappy); }
        .device-btn span { font-weight: 600; font-size: 14px; }
        .device-btn:hover { background: var(--bg-light); border-color: var(--text-muted); transform: translateY(-2px); color: var(--text-main);}
        .device-btn.active { border-color: var(--accent); color: var(--accent); background: var(--bg-light); box-shadow: 0 10px 25px rgba(0,0,0,0.4); transform: translateY(-4px); }
        .device-btn.active .lucide { transform: scale(1.1); }

        .theme-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
        .theme-preview-btn { background: var(--bg-light); border: 2px solid var(--glass-border); border-radius: 12px; width: 100%; aspect-ratio: 1; cursor: pointer; position: relative; transition: all var(--anim-snappy); display: flex; align-items: center; justify-content: center; padding: 0; overflow: hidden;}
        .theme-preview-btn::after { content: ''; position: absolute; inset: 0; background: rgba(255,255,255,0.05); opacity: 0; transition: opacity var(--anim-snappy); }
        .theme-preview-btn:hover::after { opacity: 1; }
        .theme-preview-btn:hover { border-color: var(--text-muted); transform: scale(1.05) translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .theme-preview-btn.active { border-color: var(--accent); background: var(--bg-light); transform: scale(1.1); box-shadow: 0 8px 25px rgba(0,0,0,0.4); z-index: 2;}
        .theme-color-swatch { width: 30px; height: 30px; border-radius: 8px; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.5); }

        .setting-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .setting-group.flex-row { flex-direction: row; justify-content: space-between; align-items: center; padding: 10px 0; }
        .setting-group label { color: var(--text-heading); font-size: 14px; font-weight: 500; }

        .settings-input, .settings-select { padding: 14px 16px; background: var(--bg-deep); border: 1px solid var(--glass-border); color: var(--text-heading); border-radius: 12px; outline: none; font-family: 'Inter', sans-serif; transition: all var(--anim-snappy); font-size: 14px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); }
        .settings-select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2352525b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"); background-repeat: no-repeat; background-position: right 16px top 50%; background-size: 10px auto; }
        .settings-input:focus, .settings-select:focus { border-color: var(--accent); background: var(--bg-light); box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.05); }
        
        .startup-btn { background: var(--accent); color: var(--bg-deep) !important; border: none !important; font-weight: 700; font-size: 16px; margin-top: 15px; padding: 16px !important; border-radius: 14px !important; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: all var(--anim-snappy), background-color var(--anim-smooth);}
        .startup-btn .lucide { transition: transform var(--anim-snappy); }
        .startup-btn:hover { background: var(--text-heading); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.4);}
        .startup-btn:hover .lucide { transform: translateX(5px); }

        .btn-stealth { padding: 14px; background: var(--bg-light); color: var(--text-heading); border: 1px solid var(--glass-border); border-radius: 12px; cursor: pointer; font-weight: 500; font-size: 14px; transition: all var(--anim-snappy); display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 15px; }
        .btn-stealth .lucide { width: 18px; height: 18px; flex-shrink: 0; }
        .btn-stealth:hover:not(.startup-btn) { background: var(--glass-border); border-color: var(--text-muted); transform: translateY(-2px); }

        .switch { position: relative; display: inline-block; width: 48px; height: 26px; margin: 0; flex-shrink: 0;}
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--glass-border); transition: .4s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 26px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: var(--text-muted); transition: .4s cubic-bezier(0.2, 0.8, 0.2, 1); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);}
        input:checked + .slider { background-color: var(--text-muted); }
        input:checked + .slider:before { transform: translateX(22px); background-color: var(--accent); }

        .announcement-content { display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px; }
        .update-item { display: flex; align-items: flex-start; gap: 16px; padding: 16px; border-radius: 16px; background: var(--bg-deep); border: 1px solid var(--bg-light); transition: transform var(--anim-snappy), border-color var(--anim-smooth); }
        .update-item:hover { transform: translateX(5px); border-color: var(--glass-border); background: var(--bg-light);}
        .update-icon { display: flex; align-items: center; justify-content: center; margin-top: 2px; width: 42px; height: 42px; min-width: 42px; flex-shrink: 0; background: var(--bg-light); border: 1px solid var(--glass-border); border-radius: 12px; }
        .update-icon .lucide { width: 22px; height: 22px; color: var(--accent); transition: color var(--anim-smooth);}
        .update-text { display: flex; flex-direction: column; gap: 6px; }
        .update-text h4 { margin: 0; color: var(--text-heading); font-size: 15px; font-weight: 600; }
        .update-text p { margin: 0; color: var(--text-main); font-size: 14px; line-height: 1.5; }
        
        .announcement-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 20px; border-top: 1px solid var(--glass-border); }
        .announcement-footer button { padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all var(--anim-snappy); font-family: 'Inter', sans-serif; }
        .btn-announce-secondary { background: transparent; border: 1px solid transparent; color: var(--text-muted); }
        .btn-announce-secondary:hover { color: var(--text-heading); background: var(--bg-light); }
        .btn-announce-primary { background: var(--accent); border: none; color: var(--bg-deep); transition: background-color var(--anim-smooth);}
        .btn-announce-primary:hover { background: var(--text-heading); transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.3);}

        #ad-container { position: fixed; bottom: 25px; right: 25px; z-index: 4000; background: var(--sidebar-bg); border: 1px solid var(--glass-border); border-radius: 16px; padding: 12px 18px 18px 18px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);}
        #ad-container.slide-out { transform: translateY(150%) scale(0.9); opacity: 0; pointer-events: none; }
        .ad-header { display: flex; justify-content: flex-end; margin-bottom: 8px; }
        .ad-close-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; border-radius: 8px;}
        .ad-close-btn:hover { color: var(--text-heading); background: var(--bg-light); transform: scale(1.1);}
        .ad-close-btn .lucide { width: 16px; height: 16px; }
        
        .wave-wrapper {
            position: fixed; inset: 0; z-index: 5001;
            pointer-events: none; overflow: hidden;
            display: flex; flex-direction: column; justify-content: flex-end;
        }
        .wave-fill {
            position: absolute; bottom: 0; left: 0; right: 0; height: 100vh;
            background: var(--bg-deep);
            transform: translate3d(0, 120%, 0);
            will-change: transform;
            transition: transform var(--anim-smooth);
            box-shadow: 0 -10px 50px rgba(0,0,0,0.5);
        }
        .wave-fill.active { transform: translate3d(0, 0%, 0); }
        
        .svg-waves {
            position: absolute; bottom: 99.5%; left: 0; 
            width: 100%; height: 15vh; min-height: 100px;
            pointer-events: none;
        }
        
        .parallax > use { animation: move-forever 25s cubic-bezier(.55,.5,.45,.5) infinite; }
        .parallax > use:nth-child(1) { animation-delay: -2s; animation-duration: 7s; }
        .parallax > use:nth-child(2) { animation-delay: -3s; animation-duration: 10s; }
        .parallax > use:nth-child(3) { animation-delay: -4s; animation-duration: 13s; }
        .parallax > use:nth-child(4) { animation-delay: -5s; animation-duration: 20s; }

        @keyframes move-forever { 0% { transform: translate3d(-90px,0,0); } 100% { transform: translate3d(85px,0,0); } }

        #loaderOverlay { z-index: 4500; position: absolute; inset: 0; }
        #loaderOverlay .wave-fill {
            height: 100%;
            background: var(--bg-deep);
            backdrop-filter: none; -webkit-backdrop-filter: none;
            box-shadow: none;
            display: flex; align-items: center; justify-content: center;
            transition: transform 1.5s cubic-bezier(0.65, 0, 0.35, 1);
        }
        #loaderOverlay .svg-waves { height: 120px; }
        .loading-text { 
            font-size: 20px; letter-spacing: 8px; color: var(--text-heading); 
            font-weight: 700; text-transform: uppercase; text-align: center; 
            text-shadow: 0 4px 15px rgba(0,0,0,0.6);
            opacity: 0; transform: translateY(20px); transition: all 0.5s ease;
        }
        .loading-text.active { opacity: 1; transform: translateY(0); transition-delay: 0.3s; }
