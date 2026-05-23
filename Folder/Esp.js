// ==UserScript==
// @name         Kirka.io: Full ESP + Glow + Tracers + Aim Assist
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  ESP (Wallhack + Glow), Player Tracers, and Aim Assist for Kirka.io
// @author       Fallen (Newis maharani syahrir)
// @match        https://*.kirka.io/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ========== SETTINGS ==========
    const Settings = {
        // ESP
        espEnabled: true,
        glowEnabled: true,
        glowColor: '#ff00ff',
        glowIntensity: 1.5,

        // Tracers
        tracersEnabled: true,
        tracerColor: '#ff00ff',
        tracerThickness: 2,

        // Aim Assist
        aimAssistEnabled: false,
        aimAssistStrength: 0.1, // 0.1 = subtle, 0.5 = strong
        aimAssistFOV: 100, // Pixels from crosshair to activate

        // Crosshair
        crosshairEnabled: true,
        crosshairColor: '#ff00ff',
        crosshairSize: 24,

        // FPS & Menu
        showFPS: true,
        showMenu: true,
        menuKey: 'm'
    };

    // ========== GLOBALS ==========
    let THREE = null;
    let scene = null;
    let camera = null;
    let renderer = null;
    let player = null;
    let enemies = [];
    let canvas = null;

    // ========== UTILITY: Find Three.js Objects ==========
    function initThreeJS() {
        // Find the Three.js canvas (Kirka.io uses a hidden canvas)
        canvas = document.querySelector('canvas');
        if (!canvas) {
            console.log('%c[HACK] Three.js canvas not found. Retrying...', 'color: #ff0000');
            setTimeout(initThreeJS, 1000);
            return;
        }

        // Extract Three.js from the canvas
        const webglRenderer = canvas.__webgl;
        if (!webglRenderer) {
            console.log('%c[HACK] WebGL renderer not found. Retrying...', 'color: #ff0000');
            setTimeout(initThreeJS, 1000);
            return;
        }

        renderer = webglRenderer;
        THREE = renderer.constructor.__THREE__; // Access THREE global
        if (!THREE) {
            console.log('%c[HACK] THREE not found. Retrying...', 'color: #ff0000');
            setTimeout(initThreeJS, 1000);
            return;
        }

        // Find scene and camera
        scene = renderer._cache.__scene;
        camera = renderer._cache.__camera;

        if (scene && camera) {
            console.log('%c[HACK] Three.js initialized!', 'color: #00ff00');
            initHacks();
        } else {
            console.log('%c[HACK] Scene/camera not found. Retrying...', 'color: #ff0000');
            setTimeout(initThreeJS, 1000);
        }
    }

    // ========== MODULE: ESP (Wallhack + Glow) ==========
    const ESP = (function() {
        const originalIsArray = Array.isArray;
        let isActive = false;

        function applyProxy() {
            if (isActive) return;
            Array.isArray = new Proxy(originalIsArray, {
                apply(obj, context, args) {
                    const material = args[0];
                    if (material?.map?.image?.width === 64 && material.map.image.height === 64) {
                        // Wallhack: Make transparent materials opaque
                        for (let key in material) {
                            if (material[key] === 3) material[key] = 1;
                        }
                        // Glow: Add emissive effect
                        if (Settings.glowEnabled && THREE) {
                            material.emissive = new THREE.Color(Settings.glowColor);
                            material.emissiveIntensity = Settings.glowIntensity;
                            material.needsUpdate = true;
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

    // ========== MODULE: Tracers ==========
    const Tracers = (function() {
        let canvas2D = null;
        let ctx = null;

        function init() {
            if (canvas2D) return;
            canvas2D = document.createElement('canvas');
            canvas2D.id = 'tracer-canvas';
            canvas2D.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 999998;
            `;
            document.body.appendChild(canvas2D);
            ctx = canvas2D.getContext('2d');
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
        }

        function resizeCanvas() {
            if (!canvas2D) return;
            canvas2D.width = window.innerWidth;
            canvas2D.height = window.innerHeight;
        }

        function update() {
            if (!canvas2D || !ctx || !Settings.tracersEnabled) return;

            // Clear canvas
            ctx.clearRect(0, 0, canvas2D.width, canvas2D.height);

            if (!scene || !camera) return;

            // Find all enemies (simplified: look for meshes with player-like properties)
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            // This is a placeholder. In Kirka.io, you need to find enemies dynamically.
            // For now, we'll assume we can get them from the scene.
            // (In practice, you'd need to reverse-engineer Kirka.io's entity system.)
            const allObjects = [];
            scene.traverse((obj) => {
                if (obj.isMesh && obj !== player) {
                    allObjects.push(obj);
                }
            });

            // Draw tracers to all potential enemies
            allObjects.forEach(obj => {
                if (!obj.position) return;

                // Project 3D position to 2D screen
                const vector = new THREE.Vector3();
                vector.copy(obj.position);
                vector.project(camera);

                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

                // Only draw if on screen
                if (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight) {
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(x, y);
                    ctx.strokeStyle = Settings.tracerColor;
                    ctx.lineWidth = Settings.tracerThickness;
                    ctx.stroke();
                }
            });

            requestAnimationFrame(update);
        }

        return {
            init,
            toggle: function(enable) {
                Settings.tracersEnabled = enable;
                if (enable && !canvas2D) init();
                if (enable) update();
                else if (canvas2D) {
                    canvas2D.remove();
                    canvas2D = null;
                    ctx = null;
                }
            },
            setColor: function(color) {
                Settings.tracerColor = color;
            },
            setThickness: function(thickness) {
                Settings.tracerThickness = thickness;
            }
        };
    })();

    // ========== MODULE: Aim Assist ==========
    const AimAssist = (function() {
        let isActive = false;

        function findClosestEnemy() {
            if (!scene || !camera) return null;

            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            let closestEnemy = null;
            let closestDistance = Infinity;

            // Traverse scene to find enemies (simplified)
            scene.traverse((obj) => {
                if (!obj.isMesh || obj === player) return;

                const vector = new THREE.Vector3();
                vector.copy(obj.position);
                vector.project(camera);

                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

                const distance = Math.sqrt(
                    Math.pow(x - centerX, 2) +
                    Math.pow(y - centerY, 2)
                );

                if (distance < closestDistance && distance < Settings.aimAssistFOV) {
                    closestDistance = distance;
                    closestEnemy = { obj, x, y };
                }
            });

            return closestEnemy;
        }

        function update() {
            if (!isActive || !Settings.aimAssistEnabled) return;

            const enemy = findClosestEnemy();
            if (enemy) {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const dx = enemy.x - centerX;
                const dy = enemy.y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    // Move mouse slightly toward enemy
                    const moveX = dx * Settings.aimAssistStrength;
                    const moveY = dy * Settings.aimAssistStrength;

                    // Simulate mouse movement (only works if the game uses standard mouse events)
                    const mouseMoveEvent = new MouseEvent('mousemove', {
                        clientX: centerX + moveX,
                        clientY: centerY + moveY,
                        bubbles: true
                    });
                    document.dispatchEvent(mouseMoveEvent);
                }
            }

            requestAnimationFrame(update);
        }

        return {
            toggle: function(enable) {
                isActive = enable;
                Settings.aimAssistEnabled = enable;
                if (enable) update();
            },
            setStrength: function(strength) {
                Settings.aimAssistStrength = strength;
            },
            setFOV: function(fov) {
                Settings.aimAssistFOV = fov;
            }
        };
    })();

    // ========== MODULE: Crosshair (Same as before) ==========
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

    // ========== MODULE: FPS Counter (Same as before) ==========
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

    // ========== MODULE: Menu (Updated with new features) ==========
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
                width: 280px;
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
                    .menu-slider {
                        width: 100px;
                        height: 5px;
                        background: rgba(255,0,255,0.2);
                        border-radius: 5px;
                        outline: none;
                        -webkit-appearance: none;
                    }
                    .menu-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 15px;
                        height: 15px;
                        border-radius: 50%;
                        background: ${Settings.crosshairColor};
                        cursor: pointer;
                        box-shadow: 0 0 10px ${Settings.crosshairColor};
                    }
                </style>
                <div style="padding: 12px; text-align: center; border-bottom: 2px solid ${Settings.crosshairColor}; background: rgba(255,0,255,0.15); border-radius: 13px 13px 0 0;">
                    <span style="color: ${Settings.crosshairColor}; font-weight: bold; font-size: 18px; text-shadow: 0 0 15px ${Settings.crosshairColor}; letter-spacing: 2px;">⚡ KIRKA HACKS ⚡</span>
                    <span id="menu-toggle" style="float: right; cursor: pointer; color: ${Settings.crosshairColor}; font-size: 20px;">[−]</span>
                </div>
                <div id="menu-content" style="padding: 15px;">
                    <!-- ESP -->
                    <div class="menu-item" data-setting="espEnabled">
                        <span>👁️ ESP (Wallhack)</span>
                        <span class="menu-toggle ${Settings.espEnabled ? 'on' : 'off'}">${Settings.espEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <div class="menu-item" data-setting="glowEnabled">
                        <span>✨ Glow ESP</span>
                        <span class="menu-toggle ${Settings.glowEnabled ? 'on' : 'off'}">${Settings.glowEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <div style="margin-top: 10px; padding-left: 10px; display: ${Settings.glowEnabled ? 'block' : 'none'};">
                        <div class="menu-item" data-setting="glowColor">
                            <span>Glow Color</span>
                            <span class="menu-value" style="background: ${Settings.glowColor}; width: 30px; height: 22px; display: inline-block; border-radius: 6px; border: 1px solid #fff; box-shadow: 0 0 10px ${Settings.glowColor};"></span>
                        </div>
                        <div class="menu-item">
                            <span>Glow Intensity</span>
                            <input type="range" class="menu-slider" data-setting="glowIntensity"
                                   min="0.1" max="3" step="0.1" value="${Settings.glowIntensity}">
                            <span class="menu-value" style="width: 40px;">${Settings.glowIntensity.toFixed(1)}</span>
                        </div>
                    </div>

                    <!-- Tracers -->
                    <div class="menu-item" data-setting="tracersEnabled">
                        <span>🎯 Player Tracers</span>
                        <span class="menu-toggle ${Settings.tracersEnabled ? 'on' : 'off'}">${Settings.tracersEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <div style="margin-top: 10px; padding-left: 10px; display: ${Settings.tracersEnabled ? 'block' : 'none'};">
                        <div class="menu-item" data-setting="tracerColor">
                            <span>Tracer Color</span>
                            <span class="menu-value" style="background: ${Settings.tracerColor}; width: 30px; height: 22px; display: inline-block; border-radius: 6px; border: 1px solid #fff; box-shadow: 0 0 10px ${Settings.tracerColor};"></span>
                        </div>
                        <div class="menu-item">
                            <span>Tracer Thickness</span>
                            <input type="range" class="menu-slider" data-setting="tracerThickness"
                                   min="1" max="5" step="1" value="${Settings.tracerThickness}">
                            <span class="menu-value" style="width: 30px;">${Settings.tracerThickness}px</span>
                        </div>
                    </div>

                    <!-- Aim Assist -->
                    <div class="menu-item" data-setting="aimAssistEnabled">
                        <span>🎯 Aim Assist</span>
                        <span class="menu-toggle ${Settings.aimAssistEnabled ? 'on' : 'off'}">${Settings.aimAssistEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <div style="margin-top: 10px; padding-left: 10px; display: ${Settings.aimAssistEnabled ? 'block' : 'none'};">
                        <div class="menu-item">
                            <span>Aim Strength</span>
                            <input type="range" class="menu-slider" data-setting="aimAssistStrength"
                                   min="0.01" max="0.5" step="0.01" value="${Settings.aimAssistStrength}">
                            <span class="menu-value" style="width: 40px;">${Settings.aimAssistStrength.toFixed(2)}</span>
                        </div>
                        <div class="menu-item">
                            <span>Aim FOV (px)</span>
                            <input type="range" class="menu-slider" data-setting="aimAssistFOV"
                                   min="50" max="300" step="10" value="${Settings.aimAssistFOV}">
                            <span class="menu-value" style="width: 40px;">${Settings.aimAssistFOV}</span>
                        </div>
                    </div>

                    <!-- Crosshair -->
                    <div class="menu-item" data-setting="crosshairEnabled">
                        <span>🎯 Neon Crosshair</span>
                        <span class="menu-toggle ${Settings.crosshairEnabled ? 'on' : 'off'}">${Settings.crosshairEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                    <div style="margin-top: 10px; padding-left: 10px; display: ${Settings.crosshairEnabled ? 'block' : 'none'};">
                        <div class="menu-item" data-setting="crosshairColor">
                            <span>Crosshair Color</span>
                            <span class="menu-value" style="background: ${Settings.crosshairColor}; width: 30px; height: 22px; display: inline-block; border-radius: 6px; border: 1px solid #fff; box-shadow: 0 0 10px ${Settings.crosshairColor};"></span>
                        </div>
                        <div class="menu-item">
                            <span>Crosshair Size</span>
                            <input type="range" class="menu-slider" data-setting="crosshairSize"
                                   min="16" max="40" step="2" value="${Settings.crosshairSize}">
                            <span class="menu-value" style="width: 30px;">${Settings.crosshairSize}px</span>
                        </div>
                    </div>

                    <!-- FPS -->
                    <div class="menu-item" data-setting="showFPS">
                        <span>📊 FPS Counter</span>
                        <span class="menu-toggle ${Settings.showFPS ? 'on' : 'off'}">${Settings.showFPS ? 'ON' : 'OFF'}</span>
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

            // Slider inputs
            document.querySelectorAll('.menu-slider').forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const setting = slider.dataset.setting;
                    const value = parseFloat(slider.value);
                    Settings[setting] = value;
                    updateSliderValue(slider, value);
                    applySliderSetting(setting, value);
                });
            });

            // Update sub-menu visibility
            updateSubMenuVisibility();
        }

        function handleSettingChange(setting, item) {
            switch (setting) {
                // Toggle settings
                case 'espEnabled':
                    Settings.espEnabled = !Settings.espEnabled;
                    ESP.toggle(Settings.espEnabled);
                    updateToggle(item, Settings.espEnabled);
                    break;
                case 'glowEnabled':
                    Settings.glowEnabled = !Settings.glowEnabled;
                    ESP.toggle(Settings.espEnabled || Settings.glowEnabled); // Re-apply ESP if either is on
                    updateToggle(item, Settings.glowEnabled);
                    updateSubMenuVisibility();
                    break;
                case 'tracersEnabled':
                    Settings.tracersEnabled = !Settings.tracersEnabled;
                    Tracers.toggle(Settings.tracersEnabled);
                    updateToggle(item, Settings.tracersEnabled);
                    updateSubMenuVisibility();
                    break;
                case 'aimAssistEnabled':
                    Settings.aimAssistEnabled = !Settings.aimAssistEnabled;
                    AimAssist.toggle(Settings.aimAssistEnabled);
                    updateToggle(item, Settings.aimAssistEnabled);
                    updateSubMenuVisibility();
                    break;
                case 'crosshairEnabled':
                    Settings.crosshairEnabled = !Settings.crosshairEnabled;
                    Crosshair.toggle(Settings.crosshairEnabled);
                    updateToggle(item, Settings.crosshairEnabled);
                    updateSubMenuVisibility();
                    break;
                case 'showFPS':
                    Settings.showFPS = !Settings.showFPS;
                    FPSCounter.toggle(Settings.showFPS);
                    updateToggle(item, Settings.showFPS);
                    break;

                // Color settings
                case 'glowColor':
                    const glowColors = ['#ff00ff', '#00ffff', '#ff0044', '#ff6600', '#00ff00', '#ffff00'];
                    const currentGlowIndex = glowColors.indexOf(Settings.glowColor);
                    Settings.glowColor = glowColors[(currentGlowIndex + 1) % glowColors.length];
                    updateColor(item, Settings.glowColor);
                    ESP.toggle(Settings.espEnabled || Settings.glowEnabled); // Re-apply
                    break;
                case 'tracerColor':
                    const tracerColors = ['#ff00ff', '#00ffff', '#ff0044', '#ff6600', '#00ff00', '#ffff00'];
                    const currentTracerIndex = tracerColors.indexOf(Settings.tracerColor);
                    Settings.tracerColor = tracerColors[(currentTracerIndex + 1) % tracerColors.length];
                    updateColor(item, Settings.tracerColor);
                    Tracers.setColor(Settings.tracerColor);
                    break;
                case 'crosshairColor':
                    const crosshairColors = ['#ff00ff', '#00ffff', '#ff0044', '#ff6600', '#00ff00', '#ffff00'];
                    const currentCrosshairIndex = crosshairColors.indexOf(Settings.crosshairColor);
                    Settings.crosshairColor = crosshairColors[(currentCrosshairIndex + 1) % crosshairColors.length];
                    updateColor(item, Settings.crosshairColor);
                    Crosshair.setColor(Settings.crosshairColor);
                    FPSCounter.toggle(Settings.showFPS); // Refresh FPS color
                    create(); // Recreate menu to update colors
                    break;
            }
        }

        function updateToggle(item, isOn) {
            const toggleSpan = item.querySelector('.menu-toggle');
            toggleSpan.textContent = isOn ? 'ON' : 'OFF';
            toggleSpan.className = `menu-toggle ${isOn ? 'on' : 'off'}`;
        }

        function updateColor(item, color) {
            const colorSpan = item.querySelector('.menu-value');
            colorSpan.style.background = color;
            colorSpan.style.boxShadow = `0 0 10px ${color}`;
        }

        function updateSliderValue(slider, value) {
            const valueSpan = slider.nextElementSibling;
            if (valueSpan.classList.contains('menu-value')) {
                valueSpan.textContent = typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 2) : value;
            }
        }

        function applySliderSetting(setting, value) {
            switch (setting) {
                case 'glowIntensity':
                    Settings.glowIntensity = value;
                    ESP.toggle(Settings.espEnabled || Settings.glowEnabled); // Re-apply
                    break;
                case 'tracerThickness':
                    Settings.tracerThickness = value;
                    Tracers.setThickness(value);
                    break;
                case 'aimAssistStrength':
                    Settings.aimAssistStrength = value;
                    AimAssist.setStrength(value);
                    break;
                case 'aimAssistFOV':
                    Settings.aimAssistFOV = value;
                    AimAssist.setFOV(value);
                    break;
                case 'crosshairSize':
                    Settings.crosshairSize = value;
                    Crosshair.setSize(value);
                    break;
            }
        }

        function updateSubMenuVisibility() {
            if (!element) return;
            // Glow sub-menu
            const glowSubMenu = element.querySelector(`[data-setting="glowEnabled"]`).nextElementSibling;
            if (glowSubMenu) glowSubMenu.style.display = Settings.glowEnabled ? 'block' : 'none';

            // Tracers sub-menu
            const tracersSubMenu = element.querySelector(`[data-setting="tracersEnabled"]`).nextElementSibling;
            if (tracersSubMenu) tracersSubMenu.style.display = Settings.tracersEnabled ? 'block' : 'none';

            // Aim Assist sub-menu
            const aimAssistSubMenu = element.querySelector(`[data-setting="aimAssistEnabled"]`).nextElementSibling;
            if (aimAssistSubMenu) aimAssistSubMenu.style.display = Settings.aimAssistEnabled ? 'block' : 'none';

            // Crosshair sub-menu
            const crosshairSubMenu = element.querySelector(`[data-setting="crosshairEnabled"]`).nextElementSibling;
            if (crosshairSubMenu) crosshairSubMenu.style.display = Settings.crosshairEnabled ? 'block' : 'none';
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

    // ========== INITIALIZE HACKS ==========
    function initHacks() {
        console.log('%c[HACK] Initializing hacks...', 'color: #00ff00');

        // Enable ESP (Wallhack + Glow)
        ESP.toggle(Settings.espEnabled || Settings.glowEnabled);

        // Enable Tracers
        Tracers.init();
        Tracers.toggle(Settings.tracersEnabled);

        // Enable Aim Assist
        AimAssist.toggle(Settings.aimAssistEnabled);

        // Enable Crosshair
        Crosshair.update();

        // Enable FPS Counter
        FPSCounter.toggle(Settings.showFPS);

        // Enable Menu
        Menu.toggle(Settings.showMenu);

        console.log('%c[HACK] All hacks loaded! Press [' + Settings.menuKey.toUpperCase() + '] to toggle menu.', 'color: #00ff00');
    }

    // ========== START THE SYSTEM ==========
    console.log('%c[KIRKA HACK] Loading...', 'color: #ff00ff; font-size: 16px');
    initThreeJS(); // Start by finding Three.js objects
    setupKeybinds();
})();
