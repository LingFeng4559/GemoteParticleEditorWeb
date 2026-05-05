import FloatingPalette from './FloatingPalette.js';
import CodeGenerator from './CodeGenerator.js';
import InlineEditor from './InlineEditor.js';
import lang from './LanguageManager.js';

class UIManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.initDOMElements();
        this.setupSubModules();
        this.setupEventListeners();
        this.setupCollapsibleSections();
        this.setupPanelToggle();
        this.setupLanguage();
        this.stateManager.subscribe(this.updateUI.bind(this));
    }

    setupSubModules() {
        if (this.particleColorInput) {
            this.floatingPalette = new FloatingPalette(this.stateManager, this.particleColorInput);
        }
        this.codeGenerator = new CodeGenerator(this.stateManager, this.codeOutput, this.copyCodeBtn);
        this.inlineEditor = new InlineEditor(this.stateManager, this);
        this.inlineEditor.setup();
    }

    initDOMElements() {
        const q = (s) => document.querySelector(s);
        
        this.languageSelect = q('#language-select');
        this.gemoteLoopInput = q('#gemote-loop');
        this.gemoteHeadCheckbox = q('#gemote-head');
        this.particleTypeSelect = q('#particle-type');
        this.particleColorInput = q('#particle-color');
        
        this.rgbRInput = q('#rgb-r');
        this.rgbGInput = q('#rgb-g');
        this.rgbBInput = q('#rgb-b');
        this.colorBrightnessSlider = q('#color-brightness');
        this.particleColorGroup = q('#particle-color-group');

        this.animationEnabledCheckbox = q('#animation-enabled');
        this.animationTickGroup = q('#animation-tick-group');
        this.animationTickIntervalInput = q('#animation-tick-interval');
        this.animationPreviewBtn = q('#btn-animation-preview');
        this.toggleGroupAnimationBtn = q('#btn-toggle-group-animation');
        this.selectedGroupStatus = q('#selected-group-status');
        
        this.drawingHeightSlider = q('#drawing-height');
        this.heightDisplay = q('#height-display');
        
        // 旋轉滑桿
        this.planeRotationXSlider = q('#plane-rotation-x');
        this.planeRotationYSlider = q('#plane-rotation-y');
        this.planeRotationZSlider = q('#plane-rotation-z');
        this.rotationXDisplay = q('#rotation-x-display');
        this.rotationYDisplay = q('#rotation-y-display');
        this.rotationZDisplay = q('#rotation-z-display');

        this.gridSizeSlider = q('#grid-size');
        this.gridSizeDisplay = q('#grid-size-display');
        this.cameraSensitivitySlider = q('#camera-sensitivity');
        this.sensitivityDisplay = q('#sensitivity-display');
        this.planeOffsetXSlider = q('#plane-offset-x');
        this.planeOffsetZSlider = q('#plane-offset-z');
        this.offsetXDisplay = q('#offset-x-display');
        this.offsetZDisplay = q('#offset-z-display');

        this.generateBtn = q('#btn-generate');
        this.copyCodeBtn = q('#btn-copy-code');
        this.clearBtn = q('#btn-clear');
        this.undoBtn = q('#btn-undo');
        this.codeOutput = q('#code-output');

        this.modeButtons = {
            camera: q('#btn-mode-camera'),
            select: q('#btn-mode-select'),
            point: q('#btn-mode-point'),
            brush: q('#btn-mode-brush'),
            eraser: q('#btn-mode-eraser'),
            rectangle: q('#btn-mode-rectangle'),
            circle: q('#btn-mode-circle'),
        };

        this.mirrorHorizontalXCheckbox = q('#mirror-horizontal-x');
        this.mirrorHorizontalZCheckbox = q('#mirror-horizontal-z');
        this.mirrorVerticalCheckbox = q('#mirror-vertical');

        this.pivotXInput = q('#pivot-x');
        this.pivotYInput = q('#pivot-y');
        this.pivotZInput = q('#pivot-z');
        this.btnPivotCenter = q('#btn-pivot-center');
        this.btnPivotPick = q('#btn-pivot-pick');
        this.pivotFollowCheckbox = q('#pivot-follow-plane');

        this.radialSymmetryEnabledCheckbox = q('#radial-symmetry-enabled');
        this.radialSettingsGroup = q('#radial-settings');
        this.radialAxisSelect = q('#radial-axis');
        this.radialModeSelect = q('#radial-mode');
        this.radialCountInput = q('#radial-count');
        this.radialOffsetInput = q('#radial-offset');

        this.eraserModeGroup = q('#eraser-mode-group');
        this.eraserModeButtons = {
            point: q('#btn-eraser-mode-point'),
            group: q('#btn-eraser-mode-group'),
        };
        this.shapeFillModeGroup = q('#shape-fill-mode-group');
        this.shapeFillModeButtons = {
            filled: q('#btn-shape-fill-filled'),
            outline: q('#btn-shape-fill-outline'),
        };
        this.charModeButtons = {
            opaque: q('#btn-ref-solid'),
            ghost: q('#btn-ref-ghost'),
            hidden: q('#btn-ref-hidden'),
        };
        this.particleDensitySlider = q('#particle-density');
        this.densityDisplay = q('#density-display');
        this.densityPreviewCanvas = q('#density-preview-canvas');
        if (this.densityPreviewCanvas) {
            this.densityPreviewCtx = this.densityPreviewCanvas.getContext('2d');
        }

        this.newProjectBtn = q('#btn-new-project');
        this.saveProjectBtn = q('#btn-save-project');
        this.loadProjectBtn = q('#btn-load-project');
        this.projectNameInput = q('#project-name');
        this.skillIdInput = q('#skill-id');
        this.currentProjectDisplay = q('#current-project-display');
        
        this.uiPanel = q('#ui-panel');
        this.panelCloseBtn = q('#panel-close-btn');
        this.panelOpenBtn = q('#panel-open-btn');

        this.helpPanel = q('#help-panel');
        this.helpCloseBtn = q('#help-close-btn');
    }

    setupEventListeners() {
        const safeAdd = (el, type, fn) => el && el.addEventListener(type, fn);

        Object.entries(this.modeButtons).forEach(([mode, btn]) => safeAdd(btn, 'click', () => this.stateManager.setMode(mode)));
        Object.entries(this.eraserModeButtons).forEach(([mode, btn]) => safeAdd(btn, 'click', () => this.stateManager.setEraserMode(mode)));
        Object.entries(this.shapeFillModeButtons).forEach(([mode, btn]) => safeAdd(btn, 'click', () => this.stateManager.setShapeFillMode(mode)));
        Object.entries(this.charModeButtons).forEach(([mode, btn]) => safeAdd(btn, 'click', () => this.stateManager.setCharacterMode(mode)));

        safeAdd(this.particleTypeSelect, 'change', () => this.handleParticleSettingsChange());
        safeAdd(this.particleColorInput, 'input', (e) => this.handleHexColorChange(e.target.value));
        safeAdd(this.rgbRInput, 'input', () => this.handleRgbInputChange());
        safeAdd(this.rgbGInput, 'input', () => this.handleRgbInputChange());
        safeAdd(this.rgbBInput, 'input', () => this.handleRgbInputChange());
        safeAdd(this.colorBrightnessSlider, 'input', () => this.handleBrightnessChange());

        safeAdd(this.animationEnabledCheckbox, 'change', (e) => this.stateManager.setAnimationEnabled(e.target.checked));
        safeAdd(this.animationTickIntervalInput, 'input', (e) => {
            let val = parseInt(e.target.value) || 0;
            if (val < 0) val = 0;
            if (val > 30) val = 30;
            this.stateManager.setAnimationTickInterval(val);
        });
        
        safeAdd(this.drawingHeightSlider, 'input', (e) => this.stateManager.setDrawingHeight(parseFloat(e.target.value)));
        
        // 旋轉事件綁定
        safeAdd(this.planeRotationXSlider, 'input', () => this.handlePlaneRotationChange());
        safeAdd(this.planeRotationYSlider, 'input', () => this.handlePlaneRotationChange());
        safeAdd(this.planeRotationZSlider, 'input', () => this.handlePlaneRotationChange());

        safeAdd(this.gridSizeSlider, 'input', (e) => this.stateManager.setGridSize(parseInt(e.target.value)));
        safeAdd(this.cameraSensitivitySlider, 'input', (e) => this.stateManager.setCameraSensitivity(parseFloat(e.target.value)));
        safeAdd(this.planeOffsetXSlider, 'input', () => this.handlePlaneOffsetChange());
        safeAdd(this.planeOffsetZSlider, 'input', () => this.handlePlaneOffsetChange());

        safeAdd(this.generateBtn, 'click', () => this.codeGenerator.generateAndDownload());
        safeAdd(this.copyCodeBtn, 'click', () => this.codeGenerator.generateAndCopy());
        safeAdd(this.clearBtn, 'click', () => this.requestClear());
        safeAdd(this.undoBtn, 'click', () => this.stateManager.undoLastPoint());

        safeAdd(this.projectNameInput, 'input', (e) => this.stateManager.setProjectName(e.target.value));
        safeAdd(this.skillIdInput, 'input', (e) => this.stateManager.setSkillId(e.target.value));

        safeAdd(this.gemoteLoopInput, 'input', (e) => this.stateManager.setLoop(e.target.value));
        safeAdd(this.gemoteHeadCheckbox, 'change', (e) => this.stateManager.setHead(e.target.checked));

        safeAdd(this.mirrorHorizontalXCheckbox, 'change', (e) => this.stateManager.setHorizontalMirrorEnabled(e.target.checked));
        safeAdd(this.mirrorHorizontalZCheckbox, 'change', (e) => this.stateManager.setHorizontalMirrorZEnabled(e.target.checked));
        safeAdd(this.mirrorVerticalCheckbox, 'change', (e) => this.stateManager.setVerticalMirrorEnabled(e.target.checked));

        const handlePivotChange = () => {
            this.stateManager.setMirrorPivot({
                x: parseFloat(this.pivotXInput.value) || 0,
                y: parseFloat(this.pivotYInput.value) || 0,
                z: parseFloat(this.pivotZInput.value) || 0
            });
        };
        safeAdd(this.pivotXInput, 'input', handlePivotChange);
        safeAdd(this.pivotYInput, 'input', handlePivotChange);
        safeAdd(this.pivotZInput, 'input', handlePivotChange);
        safeAdd(this.pivotFollowCheckbox, 'change', (e) => this.stateManager.setPivotFollowsPlane(e.target.checked));
        
        safeAdd(this.btnPivotCenter, 'click', () => {
            this.stateManager.setPivotFollowsPlane(true);
        });
        safeAdd(this.btnPivotPick, 'click', () => {
            this.stateManager.setMode('pivot_pick');
        });

        safeAdd(this.radialSymmetryEnabledCheckbox, 'change', (e) => this.stateManager.setRadialSymmetryEnabled(e.target.checked));
        safeAdd(this.radialAxisSelect, 'change', (e) => this.stateManager.setRadialSymmetryAxis(e.target.value));
        safeAdd(this.radialModeSelect, 'change', (e) => this.stateManager.setRadialSymmetryMode(e.target.value));
        safeAdd(this.radialCountInput, 'input', (e) => this.stateManager.setRadialSymmetryCount(e.target.value));
        safeAdd(this.radialOffsetInput, 'input', (e) => this.stateManager.setRadialSymmetryOffset(e.target.value));

        safeAdd(this.particleDensitySlider, 'input', (e) => this.stateManager.setParticleDensity(parseFloat(e.target.value)));

        safeAdd(this.helpCloseBtn, 'click', () => this.helpPanel && this.helpPanel.classList.add('hidden'));
    }

    setupLanguage() {
        if (this.languageSelect) {
            this.languageSelect.value = lang.currentLang;
            this.languageSelect.addEventListener('change', (e) => lang.setLanguage(e.target.value));
        }
        window.addEventListener('languageChanged', () => this.updateUI(this.stateManager.getState()));
        window.addEventListener('paletteColorSelected', (e) => this.handleHexColorChange(e.detail.color));
        lang.updateUI();
    }

    setupCollapsibleSections() {
        document.querySelectorAll('.section').forEach(section => {
            const title = section.querySelector('.section-title');
            if (title) {
                title.addEventListener('click', () => {
                    section.classList.toggle('collapsed');
                    const arrow = section.querySelector('.collapse-arrow');
                    if (arrow) arrow.textContent = section.classList.contains('collapsed') ? '▸' : '▾';
                });
            }
        });
    }

    setupPanelToggle() {
        safeAdd(this.panelCloseBtn, 'click', () => { this.uiPanel.classList.add('hidden'); this.panelOpenBtn.classList.add('visible'); });
        safeAdd(this.panelOpenBtn, 'click', () => { this.uiPanel.classList.remove('hidden'); this.panelOpenBtn.classList.remove('visible'); });
    }

    handleParticleSettingsChange() {
        const type = this.particleTypeSelect.value;
        let color = this.particleColorInput.value;
        const defaults = {
            flame: '#ff6600', small_flame: '#ffcc00', soul_fire_flame: '#00fbff',
            heart: '#ff0055', lava: '#ff3300', note: '#00ff00', ash: '#666666',
            white_ash: '#ffffff', smoke: '#888888', white_smoke: '#eeeeee',
            cloud: '#ffffff', water: '#00aaff', bubble: '#88ccff', glow: '#ffff00',
            electric_spark: '#aaffff', cherry_leaves: '#ffb7c5', sculk_soul: '#00ffff'
        };
        if (type !== 'redstone' && type !== 'dust' && type !== 'dust_color_transition' && defaults[type]) {
            color = defaults[type];
        }
        this.stateManager.setParticleSettings(type, color);
    }

    handleHexColorChange(hex) {
        const rgb = this.hexToRgb(hex);
        if (rgb) {
            this.rgbRInput.value = rgb.r;
            this.rgbGInput.value = rgb.g;
            this.rgbBInput.value = rgb.b;
            const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            this.colorBrightnessSlider.value = Math.round(hsl.l * 100);
            this.stateManager.setParticleSettings(this.particleTypeSelect.value, hex);
        }
    }

    handleRgbInputChange() {
        const r = Math.max(0, Math.min(255, parseInt(this.rgbRInput.value) || 0));
        const g = Math.max(0, Math.min(255, parseInt(this.rgbGInput.value) || 0));
        const b = Math.max(0, Math.min(255, parseInt(this.rgbBInput.value) || 0));
        const hex = this.rgbToHex(r, g, b);
        this.particleColorInput.value = hex;
        const hsl = this.rgbToHsl(r, g, b);
        this.colorBrightnessSlider.value = Math.round(hsl.l * 100);
        this.stateManager.setParticleSettings(this.particleTypeSelect.value, hex);
    }

    handleBrightnessChange() {
        const brightness = parseInt(this.colorBrightnessSlider.value) / 100;
        const rgb = this.hexToRgb(this.particleColorInput.value);
        if (rgb) {
            const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
            const newRgb = this.hslToRgb(hsl.h, hsl.s, brightness);
            this.rgbRInput.value = newRgb.r;
            this.rgbGInput.value = newRgb.g;
            this.rgbBInput.value = newRgb.b;
            const newHex = this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
            this.particleColorInput.value = newHex;
            this.stateManager.setParticleSettings(this.particleTypeSelect.value, newHex);
        }
    }

    handlePlaneOffsetChange() {
        this.stateManager.setPlaneOffset({ x: parseFloat(this.planeOffsetXSlider.value), z: parseFloat(this.planeOffsetZSlider.value) });
    }

    handlePlaneRotationChange() {
        const rx = this.planeRotationXSlider ? parseFloat(this.planeRotationXSlider.value) : 0;
        const ry = this.planeRotationYSlider ? parseFloat(this.planeRotationYSlider.value) : 0;
        const rz = this.planeRotationZSlider ? parseFloat(this.planeRotationZSlider.value) : 0;
        this.stateManager.setPlaneRotation({ x: rx, y: ry, z: rz });
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    }
    rgbToHex(r, g, b) { return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, l };
    }
    hslToRgb(h, s, l) {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        return { r: Math.round(hue2rgb(p, q, h + 1/3) * 255), g: Math.round(hue2rgb(p, q, h) * 255), b: Math.round(hue2rgb(p, q, h - 1/3) * 255) };
    }

    requestClear() { if (confirm(lang.get('confirm_clear_canvas'))) this.stateManager.clearPoints(); }

    updateUI(state) {
        const setTxt = (el, val) => { if(el) el.textContent = val; };
        const setVal = (el, val) => { if(el) el.value = val; };

        Object.entries(this.modeButtons).forEach(([mode, btn]) => btn && btn.classList.toggle('active', mode === state.currentMode));
        if (this.btnPivotPick) this.btnPivotPick.classList.toggle('active', state.currentMode === 'pivot_pick');
        if (this.eraserModeButtons) Object.entries(this.eraserModeButtons).forEach(([mode, btn]) => btn && btn.classList.toggle('active', mode === state.eraserMode));
        if (this.shapeFillModeButtons) Object.entries(this.shapeFillModeButtons).forEach(([mode, btn]) => btn && btn.classList.toggle('active', mode === state.shapeFillMode));
        if (this.charModeButtons) Object.entries(this.charModeButtons).forEach(([mode, btn]) => btn && btn.classList.toggle('active', mode === state.characterMode));

        if(this.eraserModeGroup) this.eraserModeGroup.style.display = state.currentMode === 'eraser' ? 'block' : 'none';
        
        const isShapeMode = state.currentMode === 'rectangle' || state.currentMode === 'circle';
        if(this.shapeFillModeGroup) this.shapeFillModeGroup.style.display = isShapeMode ? 'block' : 'none';

        setVal(this.particleTypeSelect, state.particleType);
        const isRedstone = state.particleType === 'redstone';
        if(this.particleColorGroup) this.particleColorGroup.style.display = isRedstone ? 'block' : 'none';
        
        if (isRedstone) {
            setVal(this.particleColorInput, state.particleColor);
            const rgb = this.hexToRgb(state.particleColor);
            if (rgb) {
                setVal(this.rgbRInput, rgb.r); setVal(this.rgbGInput, rgb.g); setVal(this.rgbBInput, rgb.b);
                setVal(this.colorBrightnessSlider, Math.round(this.rgbToHsl(rgb.r, rgb.g, rgb.b).l * 100));
            }
        }

        if(this.animationEnabledCheckbox) this.animationEnabledCheckbox.checked = !!state.animationEnabled;
        if(this.animationTickGroup) this.animationTickGroup.style.display = state.animationEnabled ? 'block' : 'none';
        if(this.animationTickIntervalInput) this.animationTickIntervalInput.value = state.animationTickInterval;
        
        setVal(this.drawingHeightSlider, state.drawingHeight);
        setTxt(this.heightDisplay, state.drawingHeight.toFixed(1));
        
        // 旋轉同步
        setVal(this.planeRotationXSlider, state.planeRotation.x);
        setVal(this.planeRotationYSlider, state.planeRotation.y);
        setVal(this.planeRotationZSlider, state.planeRotation.z);
        setTxt(this.rotationXDisplay, `${state.planeRotation.x}°`);
        setTxt(this.rotationYDisplay, `${state.planeRotation.y}°`);
        setTxt(this.rotationZDisplay, `${state.planeRotation.z}°`);

        setTxt(this.gridSizeDisplay, state.gridSize);
        setTxt(this.sensitivityDisplay, state.cameraSensitivity.toFixed(1));
        setTxt(this.offsetXDisplay, state.planeOffset.x);
        setTxt(this.offsetZDisplay, state.planeOffset.z);

        if (this.mirrorHorizontalXCheckbox) this.mirrorHorizontalXCheckbox.checked = !!state.horizontalMirrorEnabled;
        if (this.mirrorHorizontalZCheckbox) this.mirrorHorizontalZCheckbox.checked = !!state.horizontalMirrorZEnabled;
        if (this.mirrorVerticalCheckbox) this.mirrorVerticalCheckbox.checked = !!state.verticalMirrorEnabled;

        if (state.mirrorPivot) {
            setVal(this.pivotXInput, state.mirrorPivot.x);
            setVal(this.pivotYInput, state.mirrorPivot.y);
            setVal(this.pivotZInput, state.mirrorPivot.z);
            
            const isFollowing = !!state.pivotFollowsPlane;
            if (this.pivotFollowCheckbox) this.pivotFollowCheckbox.checked = isFollowing;
            if (this.pivotXInput) this.pivotXInput.disabled = isFollowing;
            if (this.pivotYInput) this.pivotYInput.disabled = isFollowing;
            if (this.pivotZInput) this.pivotZInput.disabled = isFollowing;
        }

        if (this.radialSymmetryEnabledCheckbox) this.radialSymmetryEnabledCheckbox.checked = !!state.radialSymmetryEnabled;
        if (this.radialSettingsGroup) this.radialSettingsGroup.style.display = state.radialSymmetryEnabled ? 'block' : 'none';
        setVal(this.radialAxisSelect, state.radialSymmetryAxis);
        setVal(this.radialModeSelect, state.radialSymmetryMode);
        setVal(this.radialCountInput, state.radialSymmetryCount);
        setVal(this.radialOffsetInput, state.radialSymmetryOffset);

        setVal(this.particleDensitySlider, state.particleDensity);
        const density = typeof state.particleDensity === 'number' ? state.particleDensity : 1.0;
        setTxt(this.densityDisplay, density.toFixed(1));
        this.drawDensityPreview(density);

        if(this.floatingPalette) this.floatingPalette.update(state);
        setVal(this.projectNameInput, state.currentProjectName);
        setVal(this.skillIdInput, state.skillId);
        setTxt(this.currentProjectDisplay, state.hasUnsavedChanges ? `${state.currentProjectName} *` : state.currentProjectName);
    }

    drawDensityPreview(density) {
        if (!this.densityPreviewCtx || !this.densityPreviewCanvas) return;
        
        const ctx = this.densityPreviewCtx;
        const w = this.densityPreviewCanvas.width;
        const h = this.densityPreviewCanvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        // 重新校準：場景實際間距為 1.8 / density。
        // 當 density = 1.0 時，間距為 1.8 單位（約一格高度）。
        // 讓預覽圖更能反應這種稀疏感。
        const baseSpacing = 40; // 增大基礎間距
        const spacing = baseSpacing / density;
        const padding = 5;
        
        ctx.fillStyle = '#0099ff';
        for (let x = padding; x <= w - padding; x += spacing) {
            for (let y = padding; y <= h - padding; y += spacing) {
                ctx.beginPath();
                const radius = Math.max(1.2, Math.min(2.5, 2.0 / density));
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    bindProjectManager(pm) {
        safeAdd(this.newProjectBtn, 'click', () => pm.newProject());
        safeAdd(this.saveProjectBtn, 'click', () => pm.saveProject());
        safeAdd(this.loadProjectBtn, 'click', () => pm.loadProject());
    }

    bindAnimationPreview(ap) {
        safeAdd(this.animationPreviewBtn, 'click', () => {
            if (ap.isRunning()) ap.stop(); else if (!ap.play()) alert(lang.get('no_points_to_preview'));
        });
    }
}

function safeAdd(el, type, fn) { if(el) el.addEventListener(type, fn); }
export default UIManager;
