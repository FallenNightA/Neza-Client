// Movement Techniques
let isDoingSlideHop = false;
let isDoingSpringHop = false;
const pressedKeys = { W: false, Space: false };

function performSlideHop() {
    if (isDoingSlideHop) return;
    isDoingSlideHop = true;
    showToast('Slide-Hop: ACTIVATED', '#ff8c00');

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
                        showToast('Slide-Hop: LANDED', '#4CAF50');
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
    showToast('Spring-Hop: ACTIVATED', '#ff8c00');

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
                        showToast('Spring-Hop: LANDED', '#4CAF50');
                    }, 50);
                }
            }, 50);
        } else {
            isDoingSpringHop = false;
        }
    }, 150);
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