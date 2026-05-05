import lang from './LanguageManager.js';

class CodeGenerator {
    constructor(stateManager, codeOutput, copyCodeBtn) {
        this.stateManager = stateManager;
        this.codeOutput = codeOutput;
        this.copyCodeBtn = copyCodeBtn;
    }

    generate() {
        const state = this.stateManager.getState();
        if (state.particlePoints.length === 0 && state.drawingGroups.length === 0) {
            const msg = lang.get('no_points_to_generate');
            this.codeOutput.value = msg;
            return msg;
        }

        const lines = [];
        lines.push('#');
        lines.push('# Emote-File created by: Gemote 3D Editor');
        lines.push('#');
        lines.push('');
        lines.push('# Defines how often the emote is looped (0 means unlimited)');
        lines.push(`loop: ${state.loop}`);
        lines.push('');
        lines.push('# Optional: Defines whether the emote is played from the player\'s head height');
        lines.push(`head: ${state.head}`);
        lines.push('');
        lines.push('pattern:');

        const byTick = new Map();
        const staticParticles = [];
        const quantize = t => Math.round(t);
        const globalTick = parseFloat(state.animationTickInterval) || 1;
        
        const addToTick = (tick, point) => {
            const key = quantize(tick);
            if (!byTick.has(key)) byTick.set(key, []);
            byTick.get(key).push(point);
        };

        state.particlePoints.forEach(point => staticParticles.push(point));

        state.drawingGroups.forEach(group => {
            if (!group.particles || group.particles.length === 0) return;
            const animatedGroup = state.animationEnabled && !!group.isAnimated;
            if (animatedGroup) {
                const tickInterval = parseFloat(group.tickInterval) || globalTick;
                group.particles.forEach((point, index) => {
                    addToTick(index * tickInterval, point);
                });
            } else {
                group.particles.forEach(point => staticParticles.push(point));
            }
        });

        const ticks = Array.from(byTick.keys()).sort((a, b) => a - b);

        staticParticles.forEach(point => {
            lines.push(`- ${this.buildParticleString(point, 0)}`);
        });

        let lastTick = 0;
        ticks.forEach((tick) => {
            const delta = quantize(tick - lastTick);
            const particlesAtTick = byTick.get(tick);
            particlesAtTick.forEach((point, index) => {
                const currentDelay = (index === 0) ? delta : 0;
                lines.push(`- ${this.buildParticleString(point, currentDelay)}`);
            });
            lastTick = tick;
        });

        const result = lines.join('\n');
        this.codeOutput.value = result;
        return result;
    }

    generateAndDownload() {
        const code = this.generate();
        if (!code || code === lang.get('no_points_to_generate')) return;

        const state = this.stateManager.getState();
        const skillId = state.skillId || 'MyDrawingEmote';
        this.download(`${skillId}.yml`, code);
    }

    generateAndCopy() {
        const code = this.generate();
        if (!code || code === lang.get('no_points_to_generate')) {
            this.showCopyFeedback(lang.get('no_content_to_copy'), false);
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                this.showCopyFeedback(lang.get('copy_success'), true);
            }).catch(err => {
                console.error('無法複製程式碼: ', err);
                this.fallbackCopyTextToClipboard(code);
            });
        } else {
            this.fallbackCopyTextToClipboard(code);
        }
    }

    buildParticleString(point, delay = 0) {
        let type = point.particleType;
        if (type === 'reddust') type = 'redstone';

        const x = (-point.x).toFixed(2);
        const y = point.y.toFixed(2);
        const z = point.z.toFixed(2);
        const delayInt = Math.round(delay);
        
        let extra = 0.01;
        const isDust = type === 'redstone' || type === 'dust' || type === 'dust_color_transition';
        if (isDust) extra = 1.0;
        if (type === 'note') extra = 1.0;
        if (type === 'heart' || type === 'poof') extra = 0;

        let base = `particle:${type} delay:${delayInt} repeat:1 amount:1 xoffset:${x} yoffset:${y} zoffset:${z} extra:${extra}`;

        if (isDust && point.color) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(point.color);
            if (result) {
                const r = parseInt(result[1], 16);
                const g = parseInt(result[2], 16);
                const b = parseInt(result[3], 16);
                base += ` data:${r}:${g}:${b}`;
            }
        }
        return `"${base}"`;
    }

    copy() {
        this.generateAndCopy();
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            this.showCopyFeedback(successful ? lang.get('copy_success') : lang.get('copy_fail'), successful);
        } catch (err) {
            this.showCopyFeedback(lang.get('copy_fail'), false);
        }
        document.body.removeChild(textArea);
    }

    showCopyFeedback(message, success) {
        const originalText = this.copyCodeBtn.textContent;
        this.copyCodeBtn.textContent = message;
        this.copyCodeBtn.style.backgroundColor = success ? '#28a745' : '#dc3545';
        setTimeout(() => {
            this.copyCodeBtn.textContent = originalText;
            this.copyCodeBtn.style.backgroundColor = '';
        }, 1500);
    }

    download(filename, content) {
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'text/yaml' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    clearOutput() {
        if (this.codeOutput.value) this.codeOutput.value = '';
    }
}

export default CodeGenerator;
