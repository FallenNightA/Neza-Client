// Hjar (ESP) System
let hjarState = 'none';
let hjarLastMs = 0;
let glCanvas = null, glCtx = null;

function initHjar() {
    if (!settings.hjarEnabled) return;

    const _origGetCtx = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, a) {
        const ctx = _origGetCtx.apply(this, arguments);
        if ((type === 'webgl' || type === 'webgl2') && !glCanvas) {
            glCanvas = this;
            glCtx = ctx;
            console.log('[Neza Client] ✅ WebGL canvas captured!');
        }
        return ctx;
    };

    const originalIsArray = Array.isArray;
    Array.isArray = new Proxy(originalIsArray, {
        apply(target, thisArg, args) {
            const material = args[0];
            const result = Reflect.apply(target, thisArg, args);
            try {
                if (settings.hjarEnabled && material?.map?.image?.width === 64) {
                    material.depthTest = false;
                    for (let key in material) {
                        if (material[key] === 3) {
                            material[key] = 1;
                            if (!window.nezaEng) {
                                window.nezaEng = material;
                                console.log('[Neza Client] ✅ Hjar Engine captured!');
                                showToast('Hjar (ESP): ACTIVE', '#4CAF50');
                            }
                        }
                    }
                }
            } catch (_) {}
            return result;
        }
    });
}

function detectHjar() {
    if (!settings.hjarEnabled || !glCanvas || !glCtx) {
        if (hjarState !== 'none') { hjarState = 'none'; updateHjarUI(); }
        return;
    }
    const now = performance.now();
    if (now - hjarLastMs < 40) return;
    hjarLastMs = now;

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
    if (typeof createCrosshair === 'function') createCrosshair();
}

// Helper for Hjar
function samplePx(x, y) {
    if (!glCtx || !glCanvas) return null;
    try {
        if (!window.pixelBuf) window.pixelBuf = new Uint8Array(4);
        glCtx.readPixels(Math.round(x), Math.round(glCanvas.height - y), 1, 1, glCtx.RGBA, glCtx.UNSIGNED_BYTE, window.pixelBuf);
        return { r: window.pixelBuf[0], g: window.pixelBuf[1], b: window.pixelBuf[2], a: window.pixelBuf[3] };
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