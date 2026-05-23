// ===== NEZA CLIENT - MAIN.JS =====
// All features combined: Slide-Hop, Spring-Hop, Hjar, Wireframe, ESC Bypass, Player Count, Clock
// Author: Fallen (Dark/Hidayat)
// For: Kirka.io

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, color = '#ff4500') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 30%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        color: ${color};
        padding: 12px 24px;
        border-radius: 10px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000000;
        box-shadow: 0 0 20px ${color};
        animation: toastSlideIn 0.3s ease-out, toastFadeOut 0.3s ease-out 2s forwards;
        text-shadow: 0 0 5px ${color};
    `;
    document.body.appendChild(toast);
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideIn {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes toastFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    setTimeout(() => toast.remove(), 2500);
}

// ========== DEFAULT SETTINGS ==========
const DEFAULT_SETTINGS = {
    // UI
    crosshairEnabled: true,
    crosshairColor: '#ff4500',
    crosshairSize: 24,
    showFPS: true,
    showMenu: true,
    menuX: 0.95,
    menuY: 0.5,

    // Features
    hjarEnabled: true,
    slideHopEnabled: false,
    springHopEnabled: false,
    wireframeEnabled: false,
    escBypassEnabled: true,
    playerCountEnabled: true,
    clockEnabled: true
};

let settings = { ...DEFAULT_SETTINGS };
let menuElement = null;
let crosshairElement = null;
let fpsElement = null;
let glCanvas = null, glCtx = null;
let pixelBuf = null;
let hjarState = 'none';
let hjarLastMs = 0;
let isDoingSlideHop = false;
let isDoingSpringHop = false;
let isDragging = false;
let dragOffsetX = 0, dragOffsetY = 0;
const pressedKeys = { W: false, Space: false };

// Load/save settings
function loadSettings() {
    const saved = localStorage.getItem('nezaClientSettings');
    if (saved) {
        try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; }
        catch (e) { console.error('[Neza Client] Failed to load settings:', e); }
    }
}
function saveSettings() {
    localStorage.setItem('nezaClientSettings', JSON.stringify(settings));
}

// ========== CAPTURE WEBGL CANVAS ==========
const _origGetCtx = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(type, a) {
    const ctx = _origGetCtx.apply(this, arguments);
    if ((type === 'webgl' || type === 'webgl2') && !glCanvas) {
        glCanvas = this; glCtx = ctx;
    }
    return ctx;
};

// ========== CANVAS-BASED DETECTION ==========
function samplePx(x, y) {
    if (!glCtx || !glCanvas) return null;
    try {
        if (!pixelBuf) pixelBuf = new Uint8Array(4);
        glCtx.readPixels(Math.round(x), Math.round(glCanvas.height - y), 1, 1, glCtx.RGBA, glCtx.UNSIGNED_BYTE, pixelBuf);
        return { r: pixelBuf[0], g: pixelBuf[1], b: pixelBuf[2], a: pixelBuf[3] };
    } catch (_) { return null; }
}

function isPlayerPx({ r, g, b, a }) {
    if (a < 30) return false;
    const br = (r + g + b) / 3;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max - min;
    if (br > 205 && sat < 30) return false;
    if (br < 15) return false;
    if (b > r + 55 && b > g + 25 && br > 130) return false;
    return true;
}

function isOnGround() {
    if (!glCanvas || !glCtx) return false;
    const points = [
        { x: glCanvas.width/2, y: glCanvas.height - 5 },
        { x: glCanvas.width/2 - 10, y: glCanvas.height - 5 },
        { x: glCanvas.width/2 + 10, y: glCanvas.height - 5 }
    ];
    for (const point of points) {
        const p = samplePx(point.x, point.y);
        if (!p) continue;
        const brightness = (p.r + p.g + p.b) / 3;
        if (brightness < 70) return true;
    }
    return false;
}

// ========== HJAR DETECTION ==========
function detectHjar() {
    if (!settings.hjarEnabled) {
        if (hjarState !== 'none') { hjarState = 'none'; updateHjarUI(); }
        return;
    }
    const now = performance.now();
    if (now - hjarLastMs < 40) return;
    hjarLastMs = now;
    if (!glCanvas || !glCtx) return;

    const cx = glCanvas.width / 2, cy = glCanvas.height / 2;
    let headHits = 0, bodyHits = 0;

    for (let dy = -36; dy <= 14; dy += 4) {
        for (let dx = -12; dx <= 12; dx += 6) {
            const p = samplePx(cx + dx, cy + dy);
            if (!p || !isPlayerPx(p)) continue;
            if (dy < -6) headHits++; else bodyHits++;
        }
    }

    const prev = hjarState;
    hjarState = headHits >= 2 ? 'head' : bodyHits >= 2 ? 'body' : 'none';
    if (hjarState !== prev) updateHjarUI();
}

function updateHjarUI() {
    if (!settings.crosshairEnabled) return;
    settings.crosshairColor = hjarState === 'head' ? '#ff4500' : hjarState === 'body' ? '#ff8c00' : '#1e90ff';
    createCrosshair();
}

// ========== KEY SIMULATION ==========
function simulateKey(key, type = 'keydown') {
    const event = new KeyboardEvent(type, {
        key: key,
        code: getKeyCode(key),
        keyCode: getKeyCodeValue(key),
        which: getKeyCodeValue(key),
        bubbles: true,
        cancelable: true
    });
    document.dispatchEvent(event);
}

function getKeyCode(key) {
    const codes = { ' ': 'Space', 'Shift': 'ShiftLeft', 'W': 'KeyW', 'G': 'KeyG' };
    return codes[key] || key;
}

function getKeyCodeValue(key) {
    const codes = { ' ': 32, 'Shift': 16, 'W': 87, 'G': 71 };
    return codes[key] || key.toUpperCase().charCodeAt(0);
}

// ========== MOVEMENT TECHNIQUES ==========
function performSlideHop() {
    if (isDoingSlideHop) return;
    isDoingSlideHop = true;
    setTimeout(() => {
        if (!isOnGround()) {
            simulateKey('Shift', 'keydown');
            const landCheck = setInterval(() => {
                if (isOnGround()) {
                    clearInterval(landCheck);
                    simulateKey('Shift', 'keyup');
                    simulateKey(' ', 'keydown');
                    setTimeout(() => {
                        simulateKey(' ', 'keyup');
                        isDoingSlideHop = false;
                    }, 50);
                }
            }, 50);
        } else {
            isDoingSlideHop = false;
        }
    }, 150);
}

function performSpringHop() {
    if (isDoingSpringHop) return;
    isDoingSpringHop = true;
    setTimeout(() => {
        if (!isOnGround()) {
            simulateKey('Shift', 'keydown');
            const landCheck = setInterval(() => {
                if (isOnGround()) {
                    clearInterval(landCheck);
                    simulateKey('Shift', 'keyup');
                    simulateKey(' ', 'keydown');
                    setTimeout(() => {
                        simulateKey(' ', 'keyup');
                        isDoingSpringHop = false;
                    }, 50);
                }
            }, 50);
        } else {
            isDoingSpringHop = false;
        }
    }, 150);
}

// ========== WIREFRAME TOGGLE (G Key) ==========
function initWireframeToggle() {
    let wireframeEnabled = false;
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 0x1902 && settings.wireframeEnabled) { // GL_LINE_WIDTH
            return wireframeEnabled ? 1 : 0;
        }
        return originalGetParameter.apply(this, arguments);
    };

    const originalDrawElements = WebGLRenderingContext.prototype.drawElements;
    WebGLRenderingContext.prototype.drawElements = function() {
        if (settings.wireframeEnabled && wireframeEnabled) {
            this.enable(this.LINES);
            this.disable(this.TRIANGLES);
        }
        return originalDrawElements.apply(this, arguments);
    };

    const originalDrawArrays = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function() {
        if (settings.wireframeEnabled && wireframeEnabled) {
            this.enable(this.LINES);
            this.disable(this.TRIANGLES);
        }
        return originalDrawArrays.apply(this, arguments);
    };

    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyG' && settings.wireframeEnabled) {
            wireframeEnabled = !wireframeEnabled;
            showToast(`Wireframe: ${wireframeEnabled ? 'ON' : 'OFF'}`, wireframeEnabled ? '#4CAF50' : '#f44336');
        }
    });
}

// ========== ESC MENU TIMER BYPASS ==========
function initESCBypass() {
    if (!settings.escBypassEnabled) return;

    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay) {
        if (delay === 3000 && fn.toString().includes('__escTimer')) {
            return originalSetTimeout(fn, 0);
        }
        return originalSetTimeout(fn, delay);
    };

    showToast('ESC Menu Bypass: ACTIVE', '#4CAF50');
}

// ========== PLAYER COUNT ==========
function initPlayerCount() {
    if (!settings.playerCountEnabled) return;

    let microwave_players = "";
    let foundmicrowave = false;
    let observer = null;
    let intervalId = null;

    function cleanup() {
        if (document.getElementById('playerholderelement')) {
            document.getElementById('playerholderelement').remove();
        }
        if (observer) {
            observer.disconnect();
        }
        if (intervalId) {
            clearInterval(intervalId);
        }
    }

    async function playercountgetter(region) {
        let playercountnumber = 0;
        try {
            const response = await fetch(`https://${region}.kirka.io/matchmake/`, { cache: 'no-cache' });
            if (!response.ok) return 0;
            const playercountJSON = await response.json();

            if (!microwave_players) {
                playercountJSON.forEach((item) => {
                    let found = 0;
                    let temp_microwave = "";
                    Object.keys(item).forEach((key) => {
                        if (typeof item[key] === "number" && item[key] < 9) {
                            found++;
                            temp_microwave = key;
                        }
                    });
                    if (found === 1 && temp_microwave) {
                        microwave_players = temp_microwave;
                        foundmicrowave = true;
                    }
                });
            }

            playercountJSON.forEach((element) => {
                playercountnumber += element[microwave_players] || 0;
            });
        } catch (err) {
            console.warn(`Error fetching player count for ${region}:`, err);
        }
        return playercountnumber;
    }

    async function createHTMLelement(text, number, id) {
        const playcountelement = document.createElement("div");
        playcountelement.id = id;
        playcountelement.className = id;
        playcountelement.innerHTML = `<div>${text}: ${number}</div>`;
        playcountelement.style.color = '#fff';
        playcountelement.style.fontSize = '14px';
        return playcountelement;
    }

    async function updatePlayerCount() {
        try {
            const regions = ['eu', 'na', 'sa', 'asia', 'oceania'];
            const counts = await Promise.all(regions.map(region => playercountgetter(region)));
            const globalplayercount = counts.reduce((sum, num) => sum + Number(num), 0);

            const elements = await Promise.all([
                createHTMLelement("TOTAL", globalplayercount, "playcountelement"),
                createHTMLelement("EU", counts[0], "playcountelementeu"),
                createHTMLelement("NA", counts[1], "playcountelementna"),
                createHTMLelement("SA", counts[2], "playcountelementsa"),
                createHTMLelement("ASIA", counts[3], "playcountelementasia"),
                createHTMLelement("OCE", counts[4], "playcountelementoce")
            ]);

            const currentlyplaying = document.createElement("div");
            currentlyplaying.id = "currentlyplaying";
            currentlyplaying.innerHTML = '<div>CURRENTLY PLAYING:</div>';
            currentlyplaying.style.color = '#fff';
            currentlyplaying.style.fontSize = '16px';
            currentlyplaying.style.fontWeight = 'bold';

            const playerholderelement = document.createElement("div");
            playerholderelement.id = "playerholderelement";
            playerholderelement.style.display = "block";
            playerholderelement.style.position = "absolute";
            playerholderelement.style.bottom = "0";
            playerholderelement.style.zIndex = "11";
            playerholderelement.style.marginBottom = "1.4rem";
            playerholderelement.style.fontFamily = "'Courier New', monospace";

            playerholderelement.append(currentlyplaying, ...elements);

            const appendToInterface = () => {
                if (window.location.href === "https://kirka.io/" &&
                    document.getElementsByClassName("interface text-2")[0] &&
                    !document.getElementById("playerholderelement")) {
                    document.getElementsByClassName("interface text-2")[0].appendChild(playerholderelement);
                }
            };

            appendToInterface();
            observer = new MutationObserver(appendToInterface);
            observer.observe(document, { subtree: true, childList: true });
            intervalId = setInterval(updatePlayerCount, 30000);
        } catch (err) {
            console.error('Error updating player count:', err);
        }
    }

    cleanup();
    updatePlayerCount();
    window.__obsidianPlayerCountCleanup = cleanup;
}

// ========== CLOCK ==========
function initClock() {
    if (!settings.clockEnabled) return;

    const clockContainer = document.createElement("div");
    clockContainer.id = "juice-clock-container";
    clockContainer.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 24px;
        z-index: 9999;
        cursor: default;
        transition: all 0.3s ease;
        user-select: none;
        background: #111;
        color: #fff;
        border: 1px solid #333;
    `;

    const themes = {
        dark: { background: "#111", color: "#fff", border: "1px solid #333" },
        light: { background: "#fff", color: "#111", border: "1px solid #ccc" },
        neon: { background: "#000", color: "#39ff14", border: "1px solid #39ff14" }
    };

    let currentTheme = "dark";

    function applyTheme(theme) {
        const t = themes[theme];
        if (!t) return;
        clockContainer.style.background = t.background;
        clockContainer.style.color = t.color;
        clockContainer.style.border = t.border;
    }
    applyTheme(currentTheme);

    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        clockContainer.innerText = timeString;
    }
    setInterval(updateClock, 1000);
    updateClock();

    const toggleButton = document.createElement("button");
    toggleButton.innerText = "🕑";
    toggleButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        padding: 6px 10px;
        border-radius: 6px;
        border: none;
        background: #444;
        color: #fff;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.3s ease;
    `;

    toggleButton.onclick = () => {
        if (clockContainer.style.display === "none") {
            clockContainer.style.display = "block";
        } else {
            clockContainer.style.display = "none";
        }
    };

    toggleButton.oncontextmenu = (e) => {
        e.preventDefault();
        const themeKeys = Object.keys(themes);
        const currentIndex = themeKeys.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themeKeys.length;
        currentTheme = themeKeys[nextIndex];
        applyTheme(currentTheme);
        showToast(`Clock Theme: ${currentTheme}`, '#1e90ff');
    };

    clockContainer.addEventListener("wheel", (e) => {
        e.preventDefault();
        let currentSize = parseFloat(clockContainer.style.fontSize);
        if (e.deltaY < 0) {
            currentSize += 2;
        } else {
            currentSize -= 2;
        }
        clockContainer.style.fontSize = `${Math.max(10, currentSize)}px`;
    });

    document.body.appendChild(clockContainer);
    document.body.appendChild(toggleButton);
}

// ========== CROSSHAIR ==========
function createCrosshair() {
    if (crosshairElement) crosshairElement.remove();
    if (!settings.crosshairEnabled) return;

    crosshairElement = document.createElement('div');
    crosshairElement.id = 'neza-crosshair';
    crosshairElement.style.cssText = `
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%); width: 0; height: 0;
        pointer-events: none; z-index: 999999;
    `;

    const size = settings.crosshairSize;
    const halfSize = size / 2;
    const lineThickness = Math.max(2, Math.floor(size / 12));

    crosshairElement.innerHTML = `
        <style>
            .ch-line { position: absolute; background: ${settings.crosshairColor};
                box-shadow: 0 0 15px ${settings.crosshairColor}, 0 0 30px ${settings.crosshairColor};
                border-radius: 3px; animation: firePulse 1s ease-in-out infinite alternate; }
            .ch-line.h { width: ${size}px; height: ${lineThickness}px; top: -${lineThickness/2}px; left: -${halfSize}px; }
            .ch-line.v { width: ${lineThickness}px; height: ${size}px; top: -${halfSize}px; left: -${lineThickness/2}px; }
            .ch-dot { position: absolute; width: ${lineThickness * 2.5}px; height: ${lineThickness * 2.5}px;
                background: ${settings.crosshairColor}; border-radius: 50%;
                top: -${lineThickness * 1.25}px; left: -${lineThickness * 1.25}px;
                box-shadow: 0 0 20px ${settings.crosshairColor}, 0 0 40px ${settings.crosshairColor};
                animation: firePulse 0.8s ease-in-out infinite alternate; }
            @keyframes firePulse {
                0% { opacity: 0.7; transform: scale(1); }
                50% { opacity: 0.9; transform: scale(1.03); }
                100% { opacity: 0.7; transform: scale(1); }
            }
        </style>
        <div class="ch-line h"></div>
        <div class="ch-line v"></div>
        <div class="ch-dot"></div>
    `;
    document.body.appendChild(crosshairElement);
}

// ========== FPS COUNTER ==========
let fps = 0, lastTime = performance.now(), frames = 0;
function createFPS() {
    if (fpsElement) fpsElement.remove();
    if (!settings.showFPS) return;

    fpsElement = document.createElement('div');
    fpsElement.id = 'neza-fps';
    fpsElement.style.cssText = `
        position: fixed; top: 10px; right: 10px; color: #1e90ff;
        background: rgba(0,0,0,0.85); padding: 5px 12px; border-radius: 8px;
        font-family: monospace; font-size: 13px; z-index: 999999;
        font-weight: bold; border: 1px solid #1e90ff;
        box-shadow: 0 0 15px rgba(30, 144, 255, 0.5);
    `;
    document.body.appendChild(fpsElement);

    function updateFPS() {
        frames++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
            fps = frames; frames = 0; lastTime = now;
            if (fpsElement) fpsElement.textContent = `⚡ FPS: ${fps}`;
        }
        requestAnimationFrame(updateFPS);
    }
    updateFPS();
}

// ========== MENU ==========
function createMenu() {
    if (menuElement) menuElement.remove();
    if (!settings.showMenu) return;

    menuElement = document.createElement('div');
    menuElement.id = 'neza-menu';
    menuElement.style.cssText = `
        position: fixed; right: 10px; top: 50%; transform: translateY(-50%);
        width: 320px; background: linear-gradient(135deg, rgba(0, 0, 30, 0.95) 0%, rgba(30, 0, 60, 0.95) 100%);
        border: 2px solid #ff4500; border-radius: 15px; color: #1e90ff;
        font-family: 'Courier New', monospace; z-index: 999999;
        backdrop-filter: blur(10px);
        box-shadow: 0 0 30px rgba(255, 69, 0, 0.4), 0 0 20px rgba(30, 144, 255, 0.4);
        cursor: move; user-select: none;
    `;

    menuElement.innerHTML = `
        <style>
            .menu-header { padding: 12px; text-align: center; border-bottom: 2px solid rgba(255, 69, 0, 0.5);
                background: linear-gradient(135deg, rgba(255, 69, 0, 0.2) 0%, rgba(30, 144, 255, 0.2) 100%);
                border-radius: 13px 13px 0 0; cursor: move; }
            .menu-header span { color: #ff4500; font-weight: bold; font-size: 18px;
                text-shadow: 0 0 10px rgba(255, 69, 0, 0.7), 0 0 20px rgba(30, 144, 255, 0.7); letter-spacing: 2px; }
            #menu-toggle { float: right; cursor: pointer; color: #ff4500; font-size: 20px; text-shadow: 0 0 5px rgba(255, 69, 0, 0.7); }
            #menu-toggle:hover { color: #ff8c00; }
            .menu-content { padding: 15px; max-height: 70vh; overflow-y: auto; }
            .menu-content::-webkit-scrollbar { width: 6px; }
            .menu-content::-webkit-scrollbar-thumb { background: rgba(255, 69, 0, 0.3); border-radius: 3px; }
            .menu-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 8px;
                cursor: pointer; border-radius: 8px; margin: 5px 0; transition: all 0.2s ease;
                font-weight: bold; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 69, 0, 0.1); }
            .menu-item:hover { background: rgba(255, 69, 0, 0.2); text-shadow: 0 0 10px rgba(255, 69, 0, 0.5);
                border-color: rgba(255, 69, 0, 0.3); transform: translateX(-3px); }
            .menu-toggle { padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: bold;
                background: rgba(30, 144, 255, 0.2); border: 1px solid #1e90ff; color: #1e90ff; transition: all 0.2s; }
            .menu-toggle.on { background: linear-gradient(135deg, #ff4500, #ff8c00); color: #000;
                box-shadow: 0 0 15px rgba(255, 69, 0, 0.5); border-color: #ff4500; }
            .menu-info { font-size: 10px; color: rgba(255, 69, 0, 0.5); margin-left: 10px; }
            .menu-footer { margin-top: 15px; text-align: center; font-size: 11px;
                color: rgba(255, 69, 0, 0.5); letter-spacing: 1.5px; }
        </style>
        <div class="menu-header">
            <span>⚡ NEZA CLIENT ⚡</span>
            <span id="menu-toggle">[−]</span>
        </div>
        <div id="menu-content" class="menu-content">
            <!-- UI Section -->
            <div style="margin-bottom: 10px; font-weight: bold; font-size: 12px; color: rgba(255, 69, 0, 0.7);">🎨 UI SETTINGS</div>
            <div class="menu-item" data-setting="crosshairEnabled">
                <span>🎯 Neon Crosshair</span>
                <span class="menu-toggle ${settings.crosshairEnabled ? 'on' : 'off'}">${settings.crosshairEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="showFPS">
                <span>📊 FPS Counter</span>
                <span class="menu-toggle ${settings.showFPS ? 'on' : 'off'}">${settings.showFPS ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="showMenu">
                <span>📜 Show Menu</span>
                <span class="menu-toggle ${settings.showMenu ? 'on' : 'off'}">${settings.showMenu ? 'ON' : 'OFF'}</span>
            </div>

            <!-- Features Section -->
            <div style="margin: 15px 0 10px; font-weight: bold; font-size: 12px; color: rgba(255, 69, 0, 0.7);">🔥 GAME FEATURES</div>
            <div class="menu-item" data-setting="hjarEnabled">
                <span>👁️ Hjar (Wallhack)</span>
                <span class="menu-toggle ${settings.hjarEnabled ? 'on' : 'off'}">${settings.hjarEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="slideHopEnabled">
                <span>🎯 Slide-Hop</span>
                <span class="menu-info">(Hold W + Space)</span>
                <span class="menu-toggle ${settings.slideHopEnabled ? 'on' : 'off'}">${settings.slideHopEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="springHopEnabled">
                <span>🌟 Spring-Hop</span>
                <span class="menu-info">(Hold Space)</span>
                <span class="menu-toggle ${settings.springHopEnabled ? 'on' : 'off'}">${settings.springHopEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="wireframeEnabled">
                <span>🔳 Wireframe Toggle</span>
                <span class="menu-info">(Press G)</span>
                <span class="menu-toggle ${settings.wireframeEnabled ? 'on' : 'off'}">${settings.wireframeEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="escBypassEnabled">
                <span>⌨️ ESC Menu Bypass</span>
                <span class="menu-info">(Removes 3s delay)</span>
                <span class="menu-toggle ${settings.escBypassEnabled ? 'on' : 'off'}">${settings.escBypassEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="playerCountEnabled">
                <span>👥 Player Count</span>
                <span class="menu-info">(Shows global/region players)</span>
                <span class="menu-toggle ${settings.playerCountEnabled ? 'on' : 'off'}">${settings.playerCountEnabled ? 'ON' : 'OFF'}</span>
            </div>
            <div class="menu-item" data-setting="clockEnabled">
                <span>🕒 Clock</span>
                <span class="menu-info">(Press 🕑 to toggle)</span>
                <span class="menu-toggle ${settings.clockEnabled ? 'on' : 'off'}">${settings.clockEnabled ? 'ON' : 'OFF'}</span>
            </div>

            <div class="menu-footer">⚡ NEZA CLIENT | DRAG TO MOVE | PRESS [M]</div>
        </div>
    `;

    document.body.appendChild(menuElement);

    // ===== DRAGGABLE MENU =====
    const menuHeader = menuElement.querySelector('.menu-header');
    menuHeader.addEventListener('mousedown', (e) => {
        if (e.target.id === 'menu-toggle') return;
        isDragging = true;
        dragOffsetX = e.clientX - menuElement.getBoundingClientRect().left;
        dragOffsetY = e.clientY - menuElement.getBoundingClientRect().top;
        menuElement.style.transition = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        menuElement.style.right = 'auto';
        menuElement.style.left = `${e.clientX - dragOffsetX}px`;
        menuElement.style.top = `${e.clientY - dragOffsetY}px`;
        menuElement.style.transform = 'none';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        menuElement.style.transition = 'all 0.2s ease';
    });

    // Menu toggle (minimize/expand)
    const toggleBtn = document.getElementById('menu-toggle');
    const contentDiv = document.getElementById('menu-content');
    let minimized = false;
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimized = !minimized;
        contentDiv.style.display = minimized ? 'none' : 'block';
        toggleBtn.textContent = minimized ? '[+]' : '[−]';
    });

    // Menu item clicks
    document.querySelectorAll('.menu-item[data-setting]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const setting = item.dataset.setting;
            if (Object.keys(DEFAULT_SETTINGS).includes(setting)) {
                settings[setting] = !settings[setting];
                const toggleSpan = item.querySelector('.menu-toggle');
                toggleSpan.textContent = settings[setting] ? 'ON' : 'OFF';
                toggleSpan.className = `menu-toggle ${settings[setting] ? 'on' : 'off'}`;

                const featureName = item.querySelector('span:first-child').textContent;
                const color = settings[setting] ? '#4CAF50' : '#f44336';
                showToast(`${featureName}: ${settings[setting] ? 'ON' : 'OFF'}`, color);

                // Re-apply features
                if (setting === 'crosshairEnabled') createCrosshair();
                if (setting === 'showFPS') createFPS();
                if (setting === 'showMenu') {
                    if (!settings.showMenu && menuElement) { menuElement.remove(); menuElement = null; }
                }
                if (setting === 'hjarEnabled' && !settings.hjarEnabled) { hjarState = 'none'; updateHjarUI(); }
                if (setting === 'wireframeEnabled') initWireframeToggle();
                if (setting === 'escBypassEnabled') initESCBypass();
                if (setting === 'playerCountEnabled') {
                    if (settings.playerCountEnabled) initPlayerCount();
                    else if (window.__obsidianPlayerCountCleanup) window.__obsidianPlayerCountCleanup();
                }
                if (setting === 'clockEnabled') {
                    if (settings.clockEnabled) initClock();
                    else {
                        const clock = document.getElementById('juice-clock-container');
                        const toggleBtn = document.querySelector('button:has-text("🕑")');
                        if (clock) clock.remove();
                        if (toggleBtn) toggleBtn.remove();
                    }
                }
                saveSettings();
            }
        });
    });
}

// ========== KEY LISTENERS ==========
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW') pressedKeys.W = true;
    if (e.code === 'Space') pressedKeys.Space = true;

    if (settings.slideHopEnabled && pressedKeys.W && e.code === 'Space' && isOnGround() && !isDoingSlideHop) {
        performSlideHop();
    }
    if (settings.springHopEnabled && e.code === 'Space' && isOnGround() && !isDoingSpringHop) {
        performSpringHop();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') pressedKeys.W = false;
    if (e.code === 'Space') pressedKeys.Space = false;
    if (e.code === 'KeyW' || e.code === 'Space') {
        isDoingSlideHop = false;
        isDoingSpringHop = false;
    }
});

// ========== MAIN LOOP ==========
function mainLoop() {
    requestAnimationFrame(mainLoop);
    detectHjar();
}

// ========== INITIALIZE ==========
loadSettings();
window.hjarLastMs = 0;
createCrosshair();
createFPS();
if (settings.showMenu) createMenu();
if (settings.wireframeEnabled) initWireframeToggle();
if (settings.escBypassEnabled) initESCBypass();
if (settings.playerCountEnabled) initPlayerCount();
if (settings.clockEnabled) initClock();
mainLoop();

console.log("%c⚡ NEZA CLIENT LOADED", "color: #ff4500; font-size: 20px; font-weight: bold;");
console.log("%cFeatures: Slide-Hop, Spring-Hop, Hjar, Wireframe (G), ESC Bypass, Player Count, Clock", "color: #1e90ff; font-size: 14px;");
