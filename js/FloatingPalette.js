import lang from './LanguageManager.js';

class FloatingPalette {
    constructor(stateManager, particleColorInput) {
        this.stateManager = stateManager;
        this.particleColorInput = particleColorInput;

        // 重新選取 DOM 元素，確保指向正確 ID
        this.container = document.getElementById('floating-palette');
        this.swatchesContainer = document.getElementById('palette-swatches');

        console.log('[Palette] 調色盤已初始化');
        this.setupSwatchEvents();
    }

    setupSwatchEvents() {
        if (!this.swatchesContainer) return;
        
        this.swatchesContainer.addEventListener('click', (event) => {
            const swatch = event.target.closest('.color-swatch');
            if (!swatch) return;

            event.stopPropagation();
            const clickedColor = swatch.dataset.color;
            if (clickedColor) {
                // 通知 UIManager
                window.dispatchEvent(new CustomEvent('paletteColorSelected', { detail: { color: clickedColor } }));
            }
        });
    }

    update(state) {
        if (!this.container || !this.swatchesContainer) return;

        const isRedstone = state.particleType === 'redstone' || state.particleType === 'reddust';
        const uniqueColors = state.usedColors || [];
        const shouldShow = isRedstone && uniqueColors.length > 0;

        // 強制切換容器的顯示
        this.container.style.display = shouldShow ? 'block' : 'none';

        if (!shouldShow) return;

        // 內容更新檢測
        const colorString = uniqueColors.join(',');
        if (this.lastColors === colorString && this.lastActive === state.particleColor) return;
        
        this.lastColors = colorString;
        this.lastActive = state.particleColor;

        this.swatchesContainer.innerHTML = '';
        uniqueColors.forEach((color) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            if (color === state.particleColor) swatch.classList.add('active');
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.style.cursor = 'pointer';
            this.swatchesContainer.appendChild(swatch);
        });
    }
}

export default FloatingPalette;
