// ==UserScript==
// @name         ESP System for Kirka.io
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Modular ESP, Crosshair, FPS, and Menu System for Kirka.io
// @author       Fallen (Newis maharani syahrir)
// @match        https://*.kirka.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ========== CENTRAL SETTINGS MANAGER ==========
    const Settings = {
        espEnabled: true,
        crosshairEnabled: true,
        crosshairColor: '#ff00ff',
        crosshairSize: 24,
        showFPS: true,
        showMenu: true,
        menuKey: 'm' // Default key to toggle menu
    };

    // ========== EVENT BUS (for inter-module communication) ==========
    const EventBus = {
        listeners: {},
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => callback(data));
            }
        },
        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        }
    };

    // ========== ESP MODULE (Wallhack) ==========
    const ESP = (function() {
        const originalIsArray = Array.isArray;
        let isActive = false;

        function applyProxy() {
            if (isActive) return;
            Array.isArray = new Proxy(originalIsArray, {
                apply(obj, context, args) {
                    const material = args[0];
                    if (material?.map?.image?.width === 64 && material.map.image.height === 64) {
                        for (let key in material) {
                            if (material[key] === 3) material[key] = 1;
                        }
                    }
                    return Reflect.apply(obj, context, args);
                }
            });
            isActive = true;
        }

        function disableProxy() {
            if (!isActive) return;
            Array.isArray = originalIsArray;
            isActive = false;
        }

        return {
            toggle: function(enable) {
                if (enable) applyProxy();
                else disableProxy();
            },
            getStatus: () => isActive
        };
    })();

    // ========== CROSSHAIR MODULE ==========
    const Crosshair = (function() {
        let element = null;

        function create() {
            if (element) element.remove();
            if (!Settings.crosshairEnabled) return;

            const size = Settings.crosshairSize;
            const halfSize = size / 2;
            const lineThickness = Math.max(2, Math.floor(size / 12));

            element = document.createElement('div');
            element.id = 'esp-crosshair';
            element.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 0;
                height: 0;
                pointer-events: none;
                z-index: 999999;
            `;

            element.innerHTML = `
                <style>
                    .ch-line {
                        position: absolute;
                        background: ${Settings.crosshairColor};
                        box-shadow: 0 0 15px ${Settings.crosshairColor}, 0 0 30px ${Settings.crosshairColor};
                        border-radius: 3px;
                        animation: neonPulse 1s ease-in-out infinite alternate;
                    }
                    .ch-line.h {
                        width: ${size}px;
                        height: ${lineThickness}px;
                        top: -${lineThickness/2}px;
                        left: -${halfSize}px;
                    }
                    .ch-line.v {
                        width: ${lineThickness}px;
                        height: ${size}px;
                        top: -${halfSize}px;
                        left: -${lineThickness/2}px;
                    }
                    .ch-dot {
                        position: absolute;
                        width: ${lineThickness * 2.5}px;
                        height: ${lineThickness * 2.5}px;
                        background: ${Settings.crosshairColor};
                        border-radius: 50%;
                        top: -${lineThickness * 1.25}px;
                        left: -${lineThickness * 1.25}px;
                        box-shadow: 0 0 20px ${Settings.crosshairColor}, 0 0 40px ${Settings.crosshairColor};
                        animation: neonPulse 0.8s ease-in-out infinite alternate;
                    }
                    @keyframes neonPulse {
                        0% { opacity: 0.7; transform: scale(1); }
                        100% { opacity: 1; transform: scale(1.05); }
                    }
                </style>
                <div class="ch-line h"></div>
                <div class="ch-line v"></div>
                <div class="ch-dot"></div>
            `;
            document.body.appendChild(element);
        }

        return {
            update: create,
            toggle: function(enable) {
                Settings.crosshairEnabled = enable;
                create();
            },
            setColor: function(color) {
                Settings.crosshairColor = color;
                create();
            },
            setSize: function(size) {
                Settings.crosshairSize = size;
                create();
            }
        };
    })();

    // ========== FPS COUNTER MODULE ==========
    const FPSCounter = (function() {
        let element = null;
        let fps = 0;
        let lastTime = performance.now();
        let frames = 0;

        function create() {
            if (element) element.remove();
            if (!Settings.showFPS) return;

            element = document.createElement('div');
            element.id = 'esp-fps';
            element.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                color: ${Settings.crosshairColor};
                background: rgba(0,0,0,0.85);
                padding: 5px 12px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 13px;
                z-index: 999999;
                font-weight: bold;
                border: 1px solid ${Settings.crosshairColor};
                box-shadow: 0 0 15px rgba(255,0,255,0.5);
                text-shadow: 0 0 8px ${Settings.crosshairColor};
            `;
            document.body.appendChild(element);

            function update() {
                frames++;
                const now = performance.now();
                if (now - lastTime >= 1000) {
                    fps = frames;
                    frames = 0;
                    lastTime = now;
                    if (element) element.textContent = `⚡ FPS: ${fps}`;
                }
                requestAnimationFrame(update);
            }
            update();
        }

        return {
            toggle: function(enable) {
                Settings.showFPS = enable;
                create();
            }
        };
    })();

    // ========== MENU MODULE ==========
    const Menu = (function() {
        let element = null;
        let minimized = false;

        function create() {
            if (element) element.remove();
            if (!Settings.showMenu) return;

            element = document.createElement('div');
            element.id = 'esp-menu';
            element.style.cssText = `
                position: fixed;
                top: 50%;
                right: 10px;
                transform: translateY(-50%);
                width: 260px;
                background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,0,30,0.95) 100%);
                border: 2px solid ${Settings.crosshairColor};
                border-radius: 15px;
                color: ${Settings.crosshairColor};
                font-family: 'Courier New', monospace;
                z-index: 999999;
                backdrop-filter: blur(10px);
                box-shadow: 0 0 30px rgba(255,0,255,0.6);
                animation: neonBorderPulse 1.5s ease-in-out infinite alternate;
            `;

            element.innerHTML = `
                <style>
                    @keyframes neonBorderPulse {
                        0% { border-color: ${Settings.crosshairColor}; box-shadow: 0 0 20px rgba(255,0,255,0.4); }
                        100% { border-color: #ff66ff; box-shadow: 0 0 45px rgba(255,0,255,0.9); }
                    }
                    .menu-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 10px 8px;
                        cursor: pointer;
                        border-radius: 8px;
                        margin: 5px 0;
                        transition: all 0.2s ease;
                        font-weight: bold;
                    }
                    .menu-item:hover {
                        background: rgba(255,0,255,0.25);
                        text-shadow: 0 0 10px ${Settings.crosshairColor};
                        transform: translateX(-3px);
                    }
                    .menu-toggle {
                        padding: 3px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    .menu-toggle.on {
                        background: linear-gradient(135deg, ${Settings.crosshairColor}, #ff66ff);
                        color: #000;
                        box-shadow: 0 0 15px ${Settings.crosshairColor};
                    }
                    .menu-toggle.off {
                        background: #1a001a;
                        color: #ff66ff;
                        border: 1px solid ${Settings.crosshairColor};
                    }
                    .menu-value {
                        background: linear-gradient(135deg, rgba(255,0,255,0.2), rgba(255,0,255,0.05));
                        padding: 3px 12px;
                        border-radius: 20px;
                        font-size: 11px;
                        border: 1px solid ${Settings.crosshairColor};
                    }
                </style>
                <div style="padding: 12px; text-align: center; border-bottom: 2px solid ${Settings.crosshairColor}; background: rgba(255,0,255,0.15); border-radius: 13px 13px 0 0;">
                    <span style="color: ${Settings.crosshairColor}; font-weight: bold; font-size: 18px; text-shadow: 0 0 15px ${Settings.crosshairColor}; letter-spacing: 2px;">⚡ ESP MENU ⚡</span>
                    <span id="menu-toggle" style="float: right; cursor: pointer; color: ${Settings.crosshairColor}; font-size: 20px;">[−]</span>
                </div>
                <div id="menu-content" style="padding: 15px;">
                    <div class="menu-item" data-setting="espEnabled">
                        <span>👁️ ESP (Wallhack)</span>
                        <span class="menu-toggle ${Settings.espEnabled ? 'on' : 'off'}">${Settings.espEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <div class="menu-item" data-setting="crosshairEnabled">
                        <span>🎯 Neon Crosshair</span>
                        <span class="menu-toggle ${Settings.crosshairEnabled ? 'on' : 'off'}">${Settings.crosshairEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <div class="menu-item" data-setting="showFPS">
                        <span>📊 FPS Counter</span>
                        <span class="menu-toggle ${Settings.showFPS ? 'on' : 'off'}">${Settings.showFPS ? 'ON' : 'OFF'}</span>
                    </div>
                    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid ${Settings.crosshairColor}55;">
                        <div class="menu-item" data-setting="crosshairColor">
                            <span>🎨 Crosshair Color</span>
                            <span class="menu-value" style="background: ${Settings.crosshairColor}; width: 30px; height: 22px; display: inline-block; border-radius: 6px; border: 1px solid #fff; box-shadow: 0 0 10px ${Settings.crosshairColor};"></span>
                        </div>
                        <div class="menu-item" data-setting="crosshairSize">
                            <span>📏 Crosshair Size</span>
                            <span class="menu-value">${Settings.crosshairSize}px</span>
                        </div>
                    </div>
                    <div style="margin-top: 15px; text-align: center; font-size: 11px; color: ${Settings.crosshairColor}aa; letter-spacing: 1.5px;">
                        PRESS [${Settings.menuKey.toUpperCase()}] TO TOGGLE MENU
                    </div>
                </div>
            `;

            document.body.appendChild(element);

            // Menu toggle (minimize/expand)
            const toggleBtn = document.getElementById('menu-toggle');
            const contentDiv = document.getElementById('menu-content');

            toggleBtn.addEventListener('click', () => {
                minimized = !minimized;
                contentDiv.style.display = minimized ? 'none' : 'block';
                toggleBtn.textContent = minimized ? '[+]' : '[−]';
            });

            // Menu item clicks
            document.querySelectorAll('.menu-item[data-setting]').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const setting = item.dataset.setting;
                    handleSettingChange(setting, item);
                });
            });
        }

        function handleSettingChange(setting, item) {
            switch (setting) {
                case 'espEnabled':
                    Settings.espEnabled = !Settings.espEnabled;
                    ESP.toggle(Settings.espEnabled);
                    updateToggle(item, Settings.espEnabled);
                    break;
                case 'crosshairEnabled':
                    Settings.crosshairEnabled = !Settings.crosshairEnabled;
                    Crosshair.toggle(Settings.crosshairEnabled);
                    updateToggle(item, Settings.crosshairEnabled);
                    break;
                case 'showFPS':
                    Settings.showFPS = !Settings.showFPS;
                    FPSCounter.toggle(Settings.showFPS);
                    updateToggle(item, Settings.showFPS);
                    break;
                case 'crosshairColor':
                    const colors = ['#ff00ff', '#00ffff', '#ff0044', '#ff6600', '#00ff00', '#ffff00'];
                    const currentIndex = colors.indexOf(Settings.crosshairColor);
                    Settings.crosshairColor = colors[(currentIndex + 1) % colors.length];
                    Crosshair.setColor(Settings.crosshairColor);
                    FPSCounter.toggle(Settings.showFPS); // Refresh FPS color
                    updateColor(item);
                    create(); // Recreate menu to update colors
                    break;
                case 'crosshairSize':
                    const sizes = [16, 20, 24, 28, 32, 36, 40];
                    const currentSizeIndex = sizes.indexOf(Settings.crosshairSize);
                    Settings.crosshairSize = sizes[(currentSizeIndex + 1) % sizes.length];
                    Crosshair.setSize(Settings.crosshairSize);
                    updateSize(item);
                    break;
            }
        }

        function updateToggle(item, isOn) {
            const toggleSpan = item.querySelector('.menu-toggle');
            toggleSpan.textContent = isOn ? 'ON' : 'OFF';
            toggleSpan.className = `menu-toggle ${isOn ? 'on' : 'off'}`;
        }

        function updateColor(item) {
            const colorSpan = item.querySelector('.menu-value');
            colorSpan.style.background = Settings.crosshairColor;
            colorSpan.style.boxShadow = `0 0 15px ${Settings.crosshairColor}`;
        }

        function updateSize(item) {
            const sizeSpan = item.querySelector('.menu-value');
            sizeSpan.textContent = `${Settings.crosshairSize}px`;
        }

        return {
            toggle: function(enable) {
                Settings.showMenu = enable;
                if (enable) create();
                else if (element) {
                    element.remove();
                    element = null;
                }
            },
            update: create
        };
    })();

    // ========== KEYBIND HANDLER ==========
    function setupKeybinds() {
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === Settings.menuKey.toLowerCase()) {
                Settings.showMenu = !Settings.showMenu;
                Menu.toggle(Settings.showMenu);
            }
        });
    }

    // ========== INITIALIZE SYSTEM ==========
    function init() {
        console.log("%c[ESP SYSTEM] Loading...", "color: #ff00ff; font-size: 16px");
        ESP.toggle(Settings.espEnabled);
        Crosshair.update();
        FPSCounter.toggle(Settings.showFPS);
        Menu.toggle(Settings.showMenu);
        setupKeybinds();
        console.log("%c[ESP SYSTEM] Loaded! Press [" + Settings.menuKey.toUpperCase() + "] to toggle menu.", "color: #00ff00");
    }

    // Start the system
    init();
})();
