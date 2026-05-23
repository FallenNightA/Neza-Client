// ===== NEZA CLIENT - MAIN FILE =====
// Load all features

// ========== LOAD UTILS ==========
// @require      utils/toast.js
// @require      core/settings.js

// ========== LOAD FEATURES ==========
// @require      features/hjar.js
// @require      features/movement.js
// @require      features/wireframe.js
// @require      features/escBypass.js
// @require      features/playerCount.js
// @require      features/clock.js

// ========== LOAD CORE UI ==========
// @require      core/crosshair.js
// @require      core/fps.js
// @require      core/menu.js

// ========== INITIALIZE ==========
// Wait for DOM to be ready
function waitForDOM() {
    if (document.body) {
        initializeClient();
    } else {
        setTimeout(waitForDOM, 100);
    }
}

function initializeClient() {
    loadSettings();

    // Initialize all features
    if (settings.hjarEnabled) initHjar();
    createCrosshair();
    createFPS();
    if (settings.showMenu) createMenu();
    if (settings.wireframeEnabled) initWireframeToggle();
    if (settings.escBypassEnabled) initESCBypass();
    if (settings.playerCountEnabled) initPlayerCount();
    if (settings.clockEnabled) initClock();

    // Set up key listeners
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyW') pressedKeys.W = true;
        if (e.code === 'Space') pressedKeys.Space = true;

        if (settings.slideHopEnabled && pressedKeys.W && e.code === 'Space' && isOnGround() && !isDoingSlideHop) {
            performSlideHop();
        }
        if (settings.springHopEnabled && e.code === 'Space' && isOnGround() && !isDoingSpringHop) {
            performSpringHop();
        }
        if (e.key === 'm' || e.key === 'M') {
            e.preventDefault();
            settings.showMenu = !settings.showMenu;
            if (settings.showMenu) {
                createMenu();
            } else if (menuElement) {
                menuElement.remove();
                menuElement = null;
            }
            saveSettings();
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

    // Main loop for Hjar detection
    function mainLoop() {
        requestAnimationFrame(mainLoop);
        if (settings.hjarEnabled) detectHjar();
    }
    mainLoop();

    console.log("%c⚡ NEZA CLIENT LOADED", "color: #ff4500; font-size: 20px; font-weight: bold;");
    console.log("%cAll features loaded! Press [M] for menu.", "color: #1e90ff; font-size: 14px;");
}

waitForDOM();