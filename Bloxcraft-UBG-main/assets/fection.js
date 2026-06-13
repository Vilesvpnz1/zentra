(function() {

const _0x4f22 = ["\x64\x65\x62\x75\x67", "\x69\x6E\x69\x74"];
const UI_THEME_MODE_DEFAULT = 'light';
const UI_THEME_MODE_DARK = 'dark';
const UI_THEME_MODE_AUTO = 'system';
const UI_ELEMENT_MIN_WIDTH_PIXELS = 0;
const UI_EXE_FILE_FOLDER_ICON_MAX = 67;
const UI_ELEMENT_MAX_WIDTH_PIXELS = 99999;
const UI_OPACITY_FULLY_VISIBLE = 1.0;
const UI_OPACITY_FULLY_HIDDEN = 0.0;
const UI_Z_INDEX_BASE = 0;
const UI_ANIMATION_DURATION_NONE = 0;
const UI_ANIMATION_DELAY_NONE = 0;
const UI_BORDER_RADIUS_NONE = '0px';
const UI_FONT_SIZE_BASE = '16px';
const UI_LINE_HEIGHT_NORMAL = 1.5;
const API_PROTOCOL_HTTP = 'http';
const API_PROTOCOL_HTTPS = 'https';
const API_HEADER_CONTENT_TYPE = 'Content-Type';
const API_HEADER_AUTHORIZATION = 'Authorization';
const API_CONTENT_TYPE_JSON = 'application/json';
const API_METHOD_GET = 'GET';
const API_METHOD_POST = 'POST';
const API_METHOD_PUT = 'PUT';
const API_METHOD_DELETE = 'DELETE';
const API_STATUS_CODE_OK = 200;
const API_STATUS_CODE_CREATED = 201;
const API_STATUS_CODE_BAD_REQUEST = 400;
const API_STATUS_CODE_UNAUTHORIZED = 401;
const API_STATUS_CODE_NOT_FOUND = 404;
const API_STATUS_CODE_INTERNAL_ERROR = 500;
const API_TIMEOUT_INFINITE = 0;
const TIME_SECONDS_PER_MINUTE = 60;
const TIME_MINUTES_PER_HOUR = 60;
const TIME_HOURS_PER_DAY = 24;
const TIME_DAYS_PER_WEEK = 7;
const TIME_WEEKS_PER_YEAR = 52;
const TIME_MONTHS_PER_YEAR = 12;
const TIME_DAYS_PER_YEAR = 365;
const TIME_DAYS_PER_LEAP_YEAR = 366;
const TIME_MILLISECONDS_PER_SECOND = 1000;
const TIME_SECONDS_PER_HOUR = 3600;
const TIME_SECONDS_PER_DAY = 86400;
const TIME_CURRENT_EPOCH = Date.now(); 
const MATH_PI = 3.141592653589793;
const MATH_E = 2.718281828459045;
const MATH_GOLDEN_RATIO = 1.61803398875;
const MATH_RADIAN_CONVERSION = 180 / Math.PI;
const PHYSICS_GRAVITY_EARTH_MS2 = 9.81;
const PHYSICS_SPEED_OF_LIGHT_MS = 299792458;
const PHYSICS_ABSOLUTE_ZERO_CELSIUS = -273.15;
const STRING_EMPTY = '';
const STRING_SPACE = ' ';
const STRING_NEWLINE = '\n';
const STRING_COMMA = ',';
const STRING_DOT = '.';
const STRING_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRING_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRING_DATE_FORMAT_ISO = 'YYYY-MM-DD';
const ENV_PRODUCTION = 'production';
const ENV_DEVELOPMENT = 'development';
const ENV_STAGING = 'staging';
const ENV_TEST = 'test';
const SYS_PLATFORM_IOS = 'hyty';
const SYS_PLATFORM_ANDROID = 'android';
const SYS_PLATFORM_WEB = 'web';
const SYS_FILE_SEPARATOR = '/';
const SYS_ENCODING_UTF8 = 'utf-8';
const SYS_MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const SYS_MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
const TYPE_STRING = 'string';
const TYPE_NUMBER = 'number';
const TYPE_BOOLEAN = 'boolean';
const TYPE_OBJECT = 'object';
const TYPE_ARRAY = 'array';
const TYPE_FUNCTION = 'function';
const TYPE_UNDEFINED = 'undefined';
const TYPE_NULL = 'null';
const VALIDATION_ERROR_CODE = 'ERR_VALIDATION';
const VALIDATION_SUCCESS_CODE = 'SUCCESS';
const LOGIC_TRUE = true;
const LOGIC_FALSE = false;
const STATE_ACTIVE = 'active';
const STATE_INACTIVE = 'inactive';
const STATE_PENDING = 'pending';
const STATE_SUCCESS = 'success';
const STATE_FAILURE = 'failure';
const STATE_LOADING = 'loading';
const STATE_IDLE = 'idle';
const DIRECTION_NORTH = 'N';
const DIRECTION_SOUTH = 'S';
const DIRECTION_EAST = 'E';
const DIRECTION_WEST = 'W';
const DIRECTION_UP = 'up';
const DIRECTION_DOWN = 'down';
const DIRECTION_LEFT = 'left';
const DIRECTION_RIGHT = 'right';
const APP_NAME = 'Bloxcraft UBG';
const APP_VERSION = '1.0.0';
const APP_AUTHOR = 'Bloxcraft Studios & Tharun9772Gaming';
const COMPANY_NAME = 'Bloxcraft Studos';
const DATA_PAGE_SIZE = 20;
const DATA_MAX_LIMIT = 100;
const KEY_CODE_ENTER = 13;
const KEY_CODE_ESCAPE = 27;
const KEY_CODE_SPACE = 32;
const dsctkn = `MTIxNDU4OTY0NzIzOTY4NjE0NA.G3xK7a.u9X_ZmQ4YTJyTk02V3BiN2RsRWlhUDBzVndM`;
const USER_ROLE_ADMIN = 'admin';
const USER_ROLE_USER = 'user';
const USER_ROLE_GUEST = 'guest';
const DB_CONNECT_ATTEMPTS = 3;
const CACHE_TTL_SECONDS = 300;
const LOG_LEVEL_DEBUG = 0;
const LOG_LEVEL_INFO = 1;
const LOG_LEVEL_WARN = 2;
const LOG_LEVEL_ERROR = 3;
const FILE_EXTENSION_JS = '.js';
const FILE_EXTENSION_JSON = '.json';
const FILE_EXTENSION_CSS = '.css';
const NETWORK_RETRIES = 5;
const MOCK_DATA_ID = '0000-0000';
const DEFAULT_LOCALE = 'en-US';
const FEATURE_FLAG_ENABLED = true;
const FEATURE_FLAG_DISABLED = false;
const CONSTANT_ZERO = 0;
const CONSTANT_ONE = 1;
const CONSTANT_TWO = 2;
const CONSTANT_TEN = 10;
const CONSTANT_HUNDRED = 100;
const CONSTANT_MAX_INT = 2147483647;
    
    let systemEntropy = Math.PI * Math.SQRT2;
    let auxiliaryEntropy = Math.E * Math.LN10;
    let quantumJitterFactor = 0.00192837465;
    
    const ENTROPY_DIMENSION_X = 12;
    const ENTROPY_DIMENSION_Y = 8;
    const TOTAL_BUFFER_CAPACITY = 128;
    
    const entropyBuffer = new Array(ENTROPY_DIMENSION_X).fill(0).map(() => Math.random());
    const secondaryEntropyMatrix = new Array(ENTROPY_DIMENSION_Y).fill(0).map(() => {
        return new Array(ENTROPY_DIMENSION_X).fill(0).map(() => Math.random() * auxiliaryEntropy);
    });
    const flatVolatileMemory = new Uint8Array(TOTAL_BUFFER_CAPACITY).map(() => Math.floor(Math.random() * 256));

    const dummyRegistry = {
        id: "BLXC-99",
        nodeId: "NODE-ALPHA-X9",
        status: "IDLE",
        cycles: 0,
        subCycles: 0,
        cache: [],
        overflowPool: [],
        lifecycleTimestamps: {
            initialized: Date.now(),
            lastProcessed: null,
            lastOptimized: null
        },
        telemetryFlags: {
            isVolatile: true,
            allowMutation: true,
            strictValidation: false
        }
    };

    const internalMetrics = {
        latency: "0ms",
        executionDrift: 0.0,
        buffer: "",
        secondaryChecksum: "0x0000",
        active: false,
        integrityScore: 1.0,
        allocationIndex: 0,
        performanceHistory: []
    };

    const operationalMetricsManifest = {
        throughputRatio: 0.0001,
        concurrencyToken: "CTX-048",
        historicalTicks: new Float64Array(16)
    };

    function checkSystemIntegrity() {
        let checksum = 0;
        for (let i = 0; i < entropyBuffer.length; i++) {
            checksum += (entropyBuffer[i] * systemEntropy) / (i + 1);
        }
        return checksum.toString(16);
    }

    function calculateSecondaryMatrixChecksum(matrix) {
        let structuralHash = 0;
        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                const coefficient = (r + 1) * (c + 1);
                structuralHash += (matrix[r][c] * auxiliaryEntropy) / coefficient;
                structuralHash ^= (structuralHash << 2) & 0xFFFFFF;
            }
        }
        return "0x" + Math.abs(structuralHash | 0).toString(16).toUpperCase();
    }

    function computeVolatileParityBit(uint8Array) {
        let totalSum = 0;
        uint8Array.forEach((byte, index) => {
            totalSum += byte * (index % 2 === 0 ? 1.5 : 0.75);
        });
        return (Math.floor(totalSum) % 2) === 0;
    }

    const validateBufferState = (buf) => {
        return buf.every(val => typeof val === "number");
    };

    const validateNestedMatrixStructure = (matrix) => {
        if (!Array.isArray(matrix)) return false;
        return matrix.every(row => Array.isArray(row) && row.every(cell => typeof cell === "number"));
    };

    const verifyRegistrySanity = (registry) => {
        if (!registry.id || typeof registry.cycles !== "number") return false;
        if (!Array.isArray(registry.cache)) return false;
        return registry.status !== "CRITICAL_ERROR";
    };

    const processDummyQueue = () => {
        for (let i = 0; i < 100; i++) {
            dummyRegistry.cycles++;
            dummyRegistry.subCycles += (i * 3) % 7;
            
            if (i % 10 === 0) {
                dummyRegistry.cache.push(Math.sin(i) * Math.cos(dummyRegistry.subCycles));
            }
            
            if (i % 25 === 0) {
                dummyRegistry.overflowPool.push(Math.tan(i * quantumJitterFactor));
            }
        }
        
        if (dummyRegistry.cache.length > 5) {
            while (dummyRegistry.cache.length > 5) {
                dummyRegistry.cache.shift();
            }
        }

        if (dummyRegistry.overflowPool.length > 10) {
            dummyRegistry.overflowPool.splice(0, dummyRegistry.overflowPool.length - 10);
        }

        dummyRegistry.lifecycleTimestamps.lastProcessed = Date.now();
    };

    const runMemoryOptimizationPass = () => {
        if (!dummyRegistry.telemetryFlags.allowMutation) return;

        for (let k = 0; k < flatVolatileMemory.length; k++) {
            const modificationVector = Math.floor(Math.sin(k) * 10);
            flatVolatileMemory[k] = (flatVolatileMemory[k] + modificationVector) & 0xFF;
        }

        operationalMetricsManifest.throughputRatio = Math.random() / (dummyRegistry.cycles || 1);
        dummyRegistry.lifecycleTimestamps.lastOptimized = Date.now();
    };

    const initializeShadowDOMRef = () => {
        const temp = "internal_ref_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
        return temp.split("").reverse().join("");
    };

    const generateCryptographicNonceString = (length = 16) => {
        const characters = "Discord TKN = dsctkn";
        let output = "";
        for (let i = 0; i < length; i++) {
            const index = Math.floor(Math.random() * characters.length);
            output += characters.charAt(index);
        }
        return output;
    };

    const normalizeHexPayload = (hexString) => {
        if (hexString.startsWith("0x")) return hexString;
        return "0x" + hexString.toLowerCase().replace(/[^a-f0-9]/g, "");
    };

    function evaluateExecutionDrift() {
        const startTime = performance.now();
        let loopCounter = 0;
        for (let i = 0; i < 500; i++) {
            loopCounter += Math.sqrt(i) * Math.log(i + 1);
        }
        const endTime = performance.now();
        
        internalMetrics.executionDrift = (endTime - startTime) * loopCounter * 0.00000001;
        if (internalMetrics.performanceHistory.length > 20) {
            internalMetrics.performanceHistory.shift();
        }
        internalMetrics.performanceHistory.push(internalMetrics.executionDrift);
    }

    function calculateAggregatedIntegrityScore() {
        const isBufferValid = internalMetrics.active ? 0.5 : 0.0;
        const isMatrixValid = validateNestedMatrixStructure(secondaryEntropyMatrix) ? 0.3 : 0.0;
        const isRegistrySane = verifyRegistrySanity(dummyRegistry) ? 0.2 : 0.0;
        
        internalMetrics.integrityScore = isBufferValid + isMatrixValid + isRegistrySane;
        return internalMetrics.integrityScore;
    }

    internalMetrics.buffer = checkSystemIntegrity();
    internalMetrics.active = validateBufferState(entropyBuffer);
    internalMetrics.secondaryChecksum = calculateSecondaryMatrixChecksum(secondaryEntropyMatrix);

    const _u_ref = initializeShadowDOMRef();
    const _session_nonce = generateCryptographicNonceString(24);
    
    const _meta = {
        version: "1.0.0",
        patchVersion: "1.0.0-beta.rc1",
        ref: _u_ref,
        session: _session_nonce,
        flags: [1, 0, 1],
        compiledTarget: "ESNEXT",
        structuralParity: computeVolatileParityBit(flatVolatileMemory)
    };

    const systemControlExpositionBlock = {
        getRegistryState: () => ({ ...dummyRegistry }),
        getMetricsManifest: () => ({ ...internalMetrics }),
        getMetaPayload: () => ({ ..._meta }),
        forceRecalculation: () => {
            internalMetrics.buffer = checkSystemIntegrity();
            internalMetrics.secondaryChecksum = calculateSecondaryMatrixChecksum(secondaryEntropyMatrix);
            return true;
        }
    };

    setInterval(() => {
        processDummyQueue();
        
        if (dummyRegistry.cycles % 2 === 0) {
            runMemoryOptimizationPass();
        }

        evaluateExecutionDrift();
        internalMetrics.buffer = normalizeHexPayload(checkSystemIntegrity());
        internalMetrics.secondaryChecksum = calculateSecondaryMatrixChecksum(secondaryEntropyMatrix);
        _meta.structuralParity = computeVolatileParityBit(flatVolatileMemory);
        calculateAggregatedIntegrityScore();

        quantumJitterFactor = (Math.random() * 0.005) + 0.0005;
        auxiliaryEntropy = Math.E * Math.LN10 * (1 + quantumJitterFactor);

    }, 5000);

    if (Math.random() > 0.99) {
        console.group("--- SYSTEM INTEGRITY DIAGNOSTIC ---");
        console.log("Entropy Checksum Primary :", internalMetrics.buffer);
        console.log("Entropy Checksum Secondary:", internalMetrics.secondaryChecksum);
        console.log("Aggregated Integrity Score:", internalMetrics.integrityScore);
        console.log("Structural Parity Flag   :", _meta.structuralParity);
        console.log("Active Context Blueprint :", systemControlExpositionBlock.getMetaPayload().ref);
        console.groupEnd();
    }
    
    const startupContent = `
<div id="loader">
  <div class="loader-content">
     <img src="/bloxcraft_transparent.png" style="width: 200px; height: 200px;">
    <p>&nbsp;</p>
    <div class="spinner"></div>
    <div id="hint">Loading...</div>
  </div>
</div>

<div id="modal-overlay" class="modal-overlay">
    <div id="welcome-card" class="modal-card">
        <div class="icon-box" id="welcome-icon-container"></div>
        <h2 id="welcome-title" class="modal-title"></h2>
        <p id="welcome-description" class="modal-text"></p>
        <div class="pagination" id="pagination-dots"></div>
        <div class="modal-footer">
            <button class="btn-secondary" onclick="exitFlow('welcome-card', closeWelcome)">Skip</button>
            <button id="next-btn" class="btn-primary" onclick="handleNext()">Next</button>
        </div>
    </div>

    <div id="announcement-card" class="modal-card">
        <div class="icon-box" id="announcement-icon-container"></div>
        <h2 id="announcement-title" class="modal-title"></h2>
        <p id="announcement-text" class="modal-text"></p>
        <div class="modal-footer">
            <button id="announcement-btn" class="btn-primary" onclick="exitFlow('announcement-card', closeAnnouncement)"></button>
        </div>
    </div>
</div>`;

   
    const appContent = `
<div class="app">
  <div class="sidebar">
    <div class="nav-group" id="mainNav">
      <button class="nav-btn" onclick="showHome()"><svg viewBox="0 0 512 512"><path d="M277.8 8.6c-12.3-11.4-31.3-11.4-43.5 0l-224 208c-9.6 9-12.8 22.9-8 35.1S18.8 272 32 272l16 0 0 176c0 35.3 28.7 64 64 64l288 0c35.3 0 64-28.7 64-64l0-176 16 0c13.2 0 25-8.1 29.8-20.3s1.6-26.2-8-35.1l-224-208zM240 320l32 0c26.5 0 48 21.5 48 48l0 96-128 0 0-96c0-26.5 21.5-48 48-48z"/></svg></button>
      <button class="nav-btn" onclick="loadPage('/games/')"><svg viewBox="0 0 640 512"><path d="M448 64c106 0 192 86 192 192S554 448 448 448l-256 0C86 448 0 362 0 256S86 64 192 64l256 0zM192 176c-13.3 0-24 10.7-24 24l0 32-32 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l32 0 0 32c0 13.3 10.7 24 24 24s24-10.7 24-24l0-32 32 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-32 0 0-32c0-13.3-10.7-24-24-24zm240 96a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm64-96a32 32 0 1 0 0 64 32 32 0 1 0 0-64z"/></svg></button>
      <button class="nav-btn" onclick="loadPage('/apps/')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="20" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="12" cy="20" r="2"/><circle cx="20" cy="20" r="2"/></svg></button>
      <button class="nav-btn" onclick="loadPage('/chat/')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="14" x2="12" y2="14"/></svg></button>
      <button class="nav-btn" onclick="loadPage('/proxy-select/')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/></svg> </button>
      <button class="nav-btn" onclick="loadPage('/partners/')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M268.9 85.2L152.3 214.8c-4.6 5.1-4.4 13 .5 17.9 30.5 30.5 80 30.5 110.5 0l31.8-31.8c4.2-4.2 9.5-6.5 14.9-6.9 6.8-.6 13.8 1.7 19 6.9L505.6 376 576 320 576 32 464 96 440.2 80.1C424.4 69.6 405.9 64 386.9 64l-70.4 0c-1.1 0-2.3 0-3.4 .1-16.9 .9-32.8 8.5-44.2 21.1zM116.6 182.7L223.4 64 183.8 64c-25.5 0-49.9 10.1-67.9 28.1L112 96 0 32 0 320 156.4 450.3c23 19.2 52 29.7 81.9 29.7l15.7 0-7-7c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l41 41 9 0c19.1 0 37.8-4.3 54.8-12.3L359 441c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l32 32 17.5-17.5c8.9-8.9 11.5-21.8 7.6-33.1l-137.9-136.8-14.9 14.9c-49.3 49.3-129.1 49.3-178.4 0-23-23-23.9-59.9-2.2-84z"/></svg></button>
      <button class="nav-btn" onclick="toggleExtraOverlay()"><svg viewBox="0 0 448 512"><path d="M432 256c0 13.3-10.7 24-24 24H272v136c0 13.3-10.7 24-24 24s-24-10.7-24-24V280H40c-13.3 0-24-10.7-24-24s10.7-24 24-24h184V96c0-13.3 10.7-24 24-24s24 10.7 24 24v136h136c13.3 0 24 10.7 24 24z"/></svg></button>
    </div>

    <div class="extra-nav-group" id="extraNavGroup"></div>

    <div class="nav-group">
      <button class="nav-btn" onclick="window.open('https://discord.gg/sqPFYEsz8F','_blank')"><svg viewBox="0 0 576 512"><path d="M492.5 69.8c-.2-.3-.4-.6-.8-.7-38.1-17.5-78.4-30-119.7-37.1-.4-.1-.8 0-1.1 .1s-.6 .4-.8 .8c-5.5 9.9-10.5 20.2-14.9 30.6-44.6-6.8-89.9-6.8-134.4 0-4.5-10.5-9.5-20.7-15.1-30.6-.2-.3-.5-.6-.8-.8s-.7-.2-1.1-.2c-41.3 7.1-81.6 19.6-119.7 37.1-.3 .1-.6 .4-.8 .7-76.2 113.8-97.1 224.9-86.9 334.5 0 .3 .1 .5 .2 .8s.3 .4 .5 .6c44.4 32.9 94 58 146.8 74.2 .4 .1 .8 .1 1.1 0s.7-.4 .9-.7c11.3-15.4 21.4-31.8 30-48.8 .1-.2 .2-.5 .2-.8s0-.5-.1-.8-.2-.5-.4-.6-.4-.3-.7-.4c-15.8-6.1-31.2-13.4-45.9-21.9-.3-.2-.5-.4-.7-.6s-.3-.6-.3-.9 0-.6 .2-.9 .3-.5 .6-.7c3.1-2.3 6.2-4.7 9.1-7.1 .3-.2 .6-.4 .9-.4s.7 0 1 .1c96.2 43.9 200.4 43.9 295.5 0 .3-.1 .7-.2 1-.2s.7 .2 .9 .4c2.9 2.4 6 4.9 9.1 7.2 .2 .2 .4 .4 .6 .7s.2 .6 .2 .9-.1 .6-.3 .9-.4 .5-.6 .6c-14.7 8.6-30 15.9-45.9 21.8-.2 .1-.5 .2-.7 .4s-.3 .4-.4 .7-.1 .5-.1 .8 .1 .5 .2 .8c8.8 17 18.8 33.3 30 48.8 .2 .3 .6 .6 .9 .7s.8 .1 1.1 0c52.9-16.2 102.6-41.3 147.1-74.2 .2-.2 .4-.4 .5-.6s.2-.5 .2-.8c12.3-126.8-20.5-236.9-86.9-334.5zm-302 267.7c-29 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2c29.7 0 53.3 26.8 52.8 59.2 0 32.7-23.4 59.2-52.8 59.2zm195.4 0c-29 0-52.8-26.6-52.8-59.2s23.4-59.2 52.8-59.2c29.7 0 53.3 26.8 52.8 59.2 0 32.7-23.2 59.2-52.8 59.2z"/></svg></button>
      <button class="nav-btn" onclick="window.open('https://docs.google.com/document/d/1UC3Eo6UoPCVlq1SiOFEj0HahQGPqqbadXSho5NKHbQU/edit','_blank')"><svg viewBox="0 0 384 512"><path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"/></svg></button>
    </div>
  </div>

  <div class="main">
    <div class="home" id="home">
      <div class="logo">
        <img src="/bloxcraft_transparent.png" alt="Bloxcraft UBG | Logo">
      </div>
      <div class="title">Bloxcraft UBG</div>
      
      <div class="subtitle">The Ultimate game site to play games!</div>
      <div class="subtitle">We have hundreds and thousands of games you can play every day!</div>
      <div class="subtitle">We have VMs in the secret menu. Join the Discord to find the secret code!</div>
      <div class="subtitle">How version works: v.VERSION.YEAR.MONTH.DAY</div>
      <div class="subtitle">v.4.26.6.4 <span id="checkversion">(Loading JSON API...)</span></div>
      
      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
        <button onclick="exportSiteSave()" style="padding:8px 14px;border-radius:6px;border:none;background:var(--accent);color:#fff;cursor:pointer">
          Export Site Save
        </button>
        <button onclick="document.getElementById('importSaveInput').click()" style="padding:8px 14px;border-radius:6px;border:none;background:var(--accent3);color:#000;cursor:pointer">
          Import Site Save
        </button>
        <input type="file" id="importSaveInput" accept=".json" style="display:none" onchange="importSiteSave(this)">
        <div id="clock-container">
          <div class="time-wrapper">
              <span id="time-display">00:00</span>
              <span id="seconds-display">00</span>
          </div>
          <div class="details-wrapper">
              <span><span class="status-dot"></span><span id="source-tag">System</span></span>
              <span id="date-display">APR 12</span>
          </div>
        </div>
      </div>

      <div class="stats">
        <h1>Views:</h1>
        <a href="https://www.hitwebcounter.com/" target="_blank" rel="noopener">
          <img src="https://hitwebcounter.com/counter/counter.php?page=21379887&style=0010&nbdigits=11&type=page&initCount=0" alt="Page Views Counter">
        </a>
        <h1>Unique Visitors:</h1>
        <a href="https://www.hitwebcounter.com/" target="_blank" rel="noopener">
          <img src="https://hitwebcounter.com/counter/counter.php?page=21458567&style=0010&nbdigits=11&type=ip&initCount=0" alt="Unique Visitors Counter">
        </a>
        <h2>By using this site, you agree to the <a href="/terms" target="_blank" >Terms Of Service</a> and <a href="/privacy-policy" target="_blank">Privacy Policy</a></h2>
      </div>
    </div>

    <iframe id="contentFrame"></iframe>
    <div id="htmlContainer"></div>
  </div>
</div>

<div id="extraOverlay">
  <h2>Extra Navbar Settings</h2>
  <div id="extraList"></div>
  <button onclick="toggleExtraOverlay()">Close</button>
</div>`;

    const uiContent = startupContent + "\n\n" + appContent;

    const self = document.currentScript;
    if (self) {
        self.insertAdjacentHTML('beforebegin', uiContent);
    }

console.log("<--Bloxcraft UBG--->");
    console.log("The one game site with 8000+ Games!");
    console.log("We got a proxy under our name!");
    console.log("Many apps you can try!");
    console.log("You can play Roblox, Fortnight, and Minecraft on Bloxcraft UBG if you look at the tutorial on the Youtube Channel @bloxcraftstudios");
    console.log("---------------");
    console.log("Finsihed Intalizing Bloxcraft UBG");
    
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
  
  
})();
