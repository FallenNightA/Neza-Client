// Wireframe Toggle (G Key)
function initWireframeToggle() {
    if (!settings.wireframeEnabled) {
        if (window.wireframeEnabled !== undefined) {
            window.wireframeEnabled = false;
            if (glCtx) {
                glCtx.enable(glCtx.TRIANGLES);
                glCtx.disable(glCtx.LINES);
            }
        }
        return;
    }

    window.wireframeEnabled = false;

    if (!glCtx) {
        setTimeout(initWireframeToggle, 500);
        return;
    }

    const originalDrawElements = glCtx.drawElements;
    glCtx.drawElements = function(mode, count, type, offset) {
        if (window.wireframeEnabled) {
            this.enable(this.LINES);
            this.disable(this.TRIANGLES);
            mode = this.LINES;
        }
        return originalDrawElements.apply(this, arguments);
    };

    const originalDrawArrays = glCtx.drawArrays;
    glCtx.drawArrays = function(mode, first, count) {
        if (window.wireframeEnabled) {
            this.enable(this.LINES);
            this.disable(this.TRIANGLES);
            mode = this.LINES;
        }
        return originalDrawArrays.apply(this, arguments);
    };

    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyG' && settings.wireframeEnabled) {
            window.wireframeEnabled = !window.wireframeEnabled;
            showToast(`Wireframe: ${window.wireframeEnabled ? 'ON' : 'OFF'}`, window.wireframeEnabled ? '#4CAF50' : '#f44336');
        }
    });
}