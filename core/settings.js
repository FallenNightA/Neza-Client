// Default Settings
const DEFAULT_SETTINGS = {
    crosshairEnabled: true,
    crosshairColor: '#ff4500',
    crosshairSize: 24,
    showFPS: true,
    showMenu: true,
    menuX: 0.95,
    menuY: 0.5,
    hjarEnabled: true,
    slideHopEnabled: false,
    springHopEnabled: false,
    wireframeEnabled: false,
    escBypassEnabled: true,
    playerCountEnabled: true,
    clockEnabled: true
};

let settings = { ...DEFAULT_SETTINGS };

// Load/Save Settings
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