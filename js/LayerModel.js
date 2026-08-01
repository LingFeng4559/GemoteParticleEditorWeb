import { normalizeModifiers, normalizeTiming, normalizeTracks, normalizeTransform } from './animation/AnimationModel.js';

export const LAYER_DEFAULTS = Object.freeze({
    parentId: null,
    visible: true,
    exportEnabled: true,
    locked: false,
    solo: false,
    expanded: true,
    layerColor: '#64748b'
});

export const isLayerContainer = layer => layer?.layerKind === 'group' || layer?.type === 'layer-group';

export function normalizeLayer(layer, index = 0) {
    const kind = isLayerContainer(layer) ? 'group' : 'content';
    return {
        ...LAYER_DEFAULTS,
        ...layer,
        layerKind: kind,
        name: typeof layer?.name === 'string' && layer.name.trim()
            ? layer.name.trim()
            : (kind === 'group' ? '新群組' : `圖層 ${index + 1}`),
        parentId: layer?.parentId || null,
        visible: layer?.visible !== false,
        exportEnabled: layer?.exportEnabled !== false,
        locked: !!layer?.locked,
        solo: !!layer?.solo,
        expanded: layer?.expanded !== false,
        order: Number.isFinite(Number(layer?.order)) ? Number(layer.order) : index,
        transform: normalizeTransform(layer?.transform),
        timing: normalizeTiming(layer?.timing),
        tracks: normalizeTracks(layer?.tracks),
        modifiers: normalizeModifiers(layer?.modifiers)
    };
}

export function normalizeLayers(layers) {
    const normalized = (Array.isArray(layers) ? layers : []).map(normalizeLayer);
    const ids = new Set(normalized.map(layer => layer.id));
    return normalized.map(layer => ({
        ...layer,
        parentId: layer.parentId && ids.has(layer.parentId) && layer.parentId !== layer.id
            ? layer.parentId
            : null
    }));
}

export function getLayerAncestors(layerId, layers) {
    const byId = new Map(layers.map(layer => [layer.id, layer]));
    const ancestors = [];
    const visited = new Set([layerId]);
    let current = byId.get(layerId);
    while (current?.parentId && !visited.has(current.parentId)) {
        visited.add(current.parentId);
        current = byId.get(current.parentId);
        if (current) ancestors.push(current);
    }
    return ancestors;
}

export function getLayerDescendantIds(layerId, layers) {
    const childrenByParent = new Map();
    for (const layer of layers) {
        if (!childrenByParent.has(layer.parentId)) childrenByParent.set(layer.parentId, []);
        childrenByParent.get(layer.parentId).push(layer);
    }
    const descendants = [];
    const queue = [...(childrenByParent.get(layerId) || [])];
    const visited = new Set([layerId]);
    while (queue.length > 0) {
        const layer = queue.shift();
        if (!layer || visited.has(layer.id)) continue;
        visited.add(layer.id);
        descendants.push(layer.id);
        queue.push(...(childrenByParent.get(layer.id) || []));
    }
    return descendants;
}

export function isLayerEffectivelyVisible(layerId, layers) {
    const layer = layers.find(item => item.id === layerId);
    if (!layer || layer.visible === false) return false;
    const soloLayers = layers.filter(item => item.solo);
    if (soloLayers.length > 0) {
        const allowed = soloLayers.some(solo =>
            solo.id === layerId ||
            getLayerDescendantIds(solo.id, layers).includes(layerId) ||
            getLayerAncestors(solo.id, layers).some(ancestor => ancestor.id === layerId)
        );
        if (!allowed) return false;
    }
    return getLayerAncestors(layerId, layers).every(ancestor => ancestor.visible !== false);
}

export function isLayerEffectivelyExported(layerId, layers) {
    const layer = layers.find(item => item.id === layerId);
    return !!layer && layer.exportEnabled !== false &&
        getLayerAncestors(layerId, layers).every(ancestor => ancestor.exportEnabled !== false);
}
