import { normalizeLayers } from '../LayerModel.js';

export const EDITOR_TAG = '#@gemote-editor';
export const LAYER_TAG = '#@gemote-layer';
export const PARTICLE_TAG = '#@gemote-particle';

const layerMetadata = layer => ({
    id: layer.id,
    type: layer.type,
    layerKind: layer.layerKind,
    name: layer.name,
    parentId: layer.parentId,
    visible: layer.visible,
    exportEnabled: layer.exportEnabled,
    locked: layer.locked,
    expanded: layer.expanded,
    order: layer.order,
    layerColor: layer.layerColor,
    particleType: layer.particleType,
    color: layer.color,
    isAnimated: layer.isAnimated,
    tickInterval: layer.tickInterval,
    source: layer.source,
    imageSettings: layer.imageSettings,
    transform: layer.transform,
    timing: layer.timing,
    tracks: layer.tracks,
    modifiers: layer.modifiers
});

export function calculateEditorChecksum(layers) {
    const text = JSON.stringify((layers || []).map(layerMetadata));
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildEditorAnnotationLines(state) {
    return [
        `${EDITOR_TAG} ${JSON.stringify({ version: 3, timelineDuration: state.timelineDuration || 80, timelineFrameInterval: state.timelineFrameInterval || 1, timelineFrameCount: state.timelineFrameCount || 80, timelineRetimingVersion: 2, checksum: calculateEditorChecksum(state.drawingGroups) })}`,
        ...state.drawingGroups.map(layer => `${LAYER_TAG} ${JSON.stringify(layerMetadata(layer))}`)
    ];
}

export const buildParticleAnnotation = layerId => `${PARTICLE_TAG} ${JSON.stringify({ layerId: layerId || null })}`;

function parseJsonAfter(line, tag) {
    try { return JSON.parse(line.slice(tag.length).trim()); } catch { return null; }
}

export function parseParticleCommand(line) {
    const content = line.match(/^\s*-\s*["']?(.+?)["']?\s*$/)?.[1];
    if (!content || !content.includes('particle:')) return null;
    const values = Object.fromEntries([...content.matchAll(/([a-zA-Z]+):([^\s"]+)/g)].map(match => [match[1], match[2]]));
    if (!values.particle || values.xoffset === undefined || values.yoffset === undefined || values.zoffset === undefined) return null;
    let color;
    if (values.data && /^\d+:\d+:\d+$/.test(values.data)) {
        color = `#${values.data.split(':').map(value => Math.max(0, Math.min(255, Number(value))).toString(16).padStart(2, '0')).join('')}`;
    }
    return {
        id: crypto.randomUUID(),
        x: -Number(values.xoffset), y: Number(values.yoffset), z: Number(values.zoffset),
        particleType: values.particle === 'reddust' ? 'redstone' : values.particle,
        ...(color ? { color } : {})
    };
}

export function parseAnnotatedYml(text) {
    const layers = [];
    const ungrouped = [];
    let editor = null;
    let pendingLayerId = null;
    let loop = 0;
    let head = false;
    for (const line of String(text || '').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith(EDITOR_TAG)) editor = parseJsonAfter(trimmed, EDITOR_TAG);
        else if (trimmed.startsWith(LAYER_TAG)) {
            const layer = parseJsonAfter(trimmed, LAYER_TAG);
            if (layer?.id) layers.push({ ...layer, particles: [] });
        } else if (trimmed.startsWith(PARTICLE_TAG)) {
            pendingLayerId = parseJsonAfter(trimmed, PARTICLE_TAG)?.layerId || null;
        } else if (/^loop\s*:/.test(trimmed)) loop = Number(trimmed.split(':')[1]) || 0;
        else if (/^head\s*:/.test(trimmed)) head = trimmed.split(':')[1].trim() === 'true';
        else {
            const particle = parseParticleCommand(trimmed);
            if (!particle) continue;
            const layer = layers.find(item => item.id === pendingLayerId);
            (layer ? layer.particles : ungrouped).push(particle);
            pendingLayerId = null;
        }
    }
    if (ungrouped.length) {
        const byType = new Map();
        for (const particle of ungrouped) {
            if (!byType.has(particle.particleType)) byType.set(particle.particleType, []);
            byType.get(particle.particleType).push(particle);
        }
        for (const [type, particles] of byType) layers.push({ id: crypto.randomUUID(), type: 'yml-import', name: `未註解：${type}`, particles });
    }
    const checksumValid = !editor?.checksum || editor.checksum === calculateEditorChecksum(layers.filter(layer => !layer.name?.startsWith('未註解：')));
    return {
        version: 3,
        name: 'YML 反解析專案',
        particles: [],
        groups: normalizeLayers(layers),
        settings: { loop, head, timelineDuration: editor?.timelineDuration || 80, timelineFrameInterval: editor?.timelineFrameInterval || 1, timelineFrameCount: editor?.timelineFrameCount || Math.round((editor?.timelineDuration || 80) / (editor?.timelineFrameInterval || 1)), timelineRetimingVersion: editor?.timelineRetimingVersion || 0 },
        importWarnings: checksumValid ? [] : ['編輯器註解 checksum 不一致；YML 可能曾被外部修改。']
    };
}
