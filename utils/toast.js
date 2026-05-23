// Toast Notifications
function showToast(message, color = '#ff4500') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; top: 30%; left: 50%; transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85); color: ${color}; padding: 12px 24px;
        border-radius: 10px; font-family: 'Courier New', monospace;
        font-size: 14px; font-weight: bold; z-index: 1000000;
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