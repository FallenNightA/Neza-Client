// ========== HJAR (ESP) SYSTEM ==========
// Captures Kirka.io engine to enable wallhack (ESP)
// Usage: Toggle in menu to enable/disable

let hjarState = 'none';
let nezaEng = null;

// Initialize Hjar when WebGL is ready
function initHjar() {
    if (!settings.hjarEnabled) return;

    const originalIsArray = Array.isArray;
    Array.isArray = new Proxy(originalIsArray, {
        apply(target, thisArg, args) {
            const material = args[0];
            const result = Reflect.apply(target, thisArg, args);

            try {
                // Check if this is a player material (texture width = 64)
                if (settings.hjarEnabled && material?.map?.image?.width === 64) {
                    // Enable wallhack by disabling depth test
                    material.depthTest = false;

                    // Change material properties for transparency
                    for (let key in material) {
                        if (material[key] === 3) {
                            material[key] = 1; // Change to make visible through walls
                            if (!nezaEng) {
                                nezaEng = material;
                                console.log('[Neza Client] ✅ Hjar Engine captured!');
                                showToast('Hjar (ESP): ACTIVE', '#4CAF50');
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[Neza Client] Hjar error:', e);
            }

            return result;
        }
    });
}

// Optional: Add Hjar detection for crosshair color change
function detectHjar() {
    if (!settings.hjarEnabled || !glCanvas || !glCtx) {
        if (hjarState !== 'none') {
            hjarState = 'none';
            updateHjarUI();
        }
        return;
    }

    const now = performance.now();
    if (now - (window.hjarLastMs || 0) < 40) return;
    window.hjarLastMs = now;

    const cx = glCanvas.width / 2;
    const cy = glCanvas.height / 2;
    let headHits = 0, bodyHits = 0;

    // Sample grid around crosshair
    for (let dy = -36; dy <= 14; dy += 4) {
        for (let dx = -12; dx <= 12; dx += 6) {
            const p = samplePx(cx + dx, cy + dy);
            if (!p || !isPlayerPx(p)) continue;
            if (dy < -6) headHits++;
            else bodyHits++;
        }
    }

    const prev = hjarState;
    hjarState = headHits >= 2 ? 'head' : bodyHits >= 2 ? 'body' : 'none';
    if (hjarState !== prev) updateHjarUI();
}

function updateHjarUI() {
    if (!settings.crosshairEnabled) return;
    if (hjarState === 'head') {
        settings.crosshairColor = '#ff4500'; // Red for head
    } else if (hjarState === 'body') {
        settings.crosshairColor = '#ff8c00'; // Orange for body
    } else {
        settings.crosshairColor = '#1e90ff'; // Default blue
    }
    if (typeof createCrosshair === 'function') {
        createCrosshair();
    }
}

// Helper function for pixel sampling (needed for detection)
function samplePx(x, y) {
    if (!glCtx || !glCanvas) return null;
    try {
        if (!window.pixelBuf) window.pixelBuf = new Uint8Array(4);
        glCtx.readPixels(
            Math.round(x),
            Math.round(glCanvas.height - y),
            1, 1,
            glCtx.RGBA, glCtx.UNSIGNED_BYTE,
            window.pixelBuf
        );
        return {
            r: window.pixelBuf[0],
            g: window.pixelBuf[1],
            b: window.pixelBuf[2],
            a: window.pixelBuf[3]
        };
    } catch (_) { return null; }
}

// Helper function to check if pixel is a player
function isPlayerPx({ r, g, b, a }) {
    if (a < 30) return false; // Too transparent
    const br = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;

    if (br > 205 && sat < 30) return false; // White wall
    if (br < 15) return false; // Void/black
    if (b > r + 55 && b > g + 25 && br > 130) return false; // Sky
    return true;
}

// Initialize Hjar when WebGL canvas is captured
const _origGetCtx = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(type, a) {
    const ctx = _origGetCtx.apply(this, arguments);
    if ((type === 'webgl' || type === 'webgl2') && !glCanvas) {
        glCanvas = this;
        glCtx = ctx;
        console.log('[Neza Client] WebGL canvas captured!');
        if (settings.hjarEnabled) {
            initHjar();
        }
    }
    return ctx;
};
