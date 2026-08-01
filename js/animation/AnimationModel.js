const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const createDefaultTransform = () => ({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    pivot: { x: 0, y: 0, z: 0 }
});

const normalizeVector = (value, fallback) => ({
    x: number(value?.x, fallback.x),
    y: number(value?.y, fallback.y),
    z: number(value?.z, fallback.z)
});

export function normalizeTransform(value = {}) {
    const defaults = createDefaultTransform();
    return {
        position: normalizeVector(value.position, defaults.position),
        rotation: normalizeVector(value.rotation, defaults.rotation),
        scale: normalizeVector(value.scale, defaults.scale),
        pivot: normalizeVector(value.pivot, defaults.pivot)
    };
}

export function normalizeTiming(value = {}) {
    return {
        startTick: Math.max(0, number(value.startTick, 0)),
        duration: Math.max(1, number(value.duration, 80)),
        loop: Math.max(1, Math.floor(number(value.loop, 1))),
        loopMode: ['repeat', 'ping-pong', 'once'].includes(value.loopMode) ? value.loopMode : 'repeat'
    };
}

export function normalizeModifier(value = {}, index = 0) {
    if (value.type !== 'spin') return { ...value, enabled: value.enabled !== false };
    return {
        id: value.id || `spin-${index}`,
        type: 'spin',
        name: value.name || '旋轉',
        enabled: value.enabled !== false,
        axis: ['X', 'Y', 'Z'].includes(String(value.axis).toUpperCase()) ? String(value.axis).toUpperCase() : 'Y',
        from: number(value.from, 0),
        to: number(value.to, 360),
        startTick: Math.max(0, number(value.startTick, 0)),
        duration: Math.max(1, number(value.duration, 80)),
        easing: ['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(value.easing) ? value.easing : 'linear'
    };
}

export const normalizeModifiers = values => (Array.isArray(values) ? values : []).map(normalizeModifier);

function ease(progress, type) {
    const t = Math.max(0, Math.min(1, progress));
    if (type === 'ease-in') return t * t;
    if (type === 'ease-out') return 1 - (1 - t) * (1 - t);
    if (type === 'ease-in-out') return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    return t;
}

export function evaluateLayerTransform(layer, tick = 0) {
    const transform = normalizeTransform(layer?.transform);
    for (const modifier of normalizeModifiers(layer?.modifiers)) {
        if (!modifier.enabled || modifier.type !== 'spin') continue;
        const progress = ease((number(tick) - modifier.startTick) / modifier.duration, modifier.easing);
        const angle = modifier.from + (modifier.to - modifier.from) * progress;
        transform.rotation[modifier.axis.toLowerCase()] += angle;
    }
    return transform;
}

export function transformPoint(point, transformValue) {
    const transform = normalizeTransform(transformValue);
    const pivot = transform.pivot;
    let x = (number(point?.x) - pivot.x) * transform.scale.x;
    let y = (number(point?.y) - pivot.y) * transform.scale.y;
    let z = (number(point?.z) - pivot.z) * transform.scale.z;
    const rx = transform.rotation.x * Math.PI / 180;
    const ry = transform.rotation.y * Math.PI / 180;
    const rz = transform.rotation.z * Math.PI / 180;

    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    return {
        ...point,
        x: x + pivot.x + transform.position.x,
        y: y + pivot.y + transform.position.y,
        z: z + pivot.z + transform.position.z
    };
}

export function evaluateWorldPoint(point, layerId, layers, tick = 0) {
    const byId = new Map((layers || []).map(layer => [layer.id, layer]));
    const chain = [];
    const visited = new Set();
    let layer = byId.get(layerId);
    while (layer && !visited.has(layer.id)) {
        visited.add(layer.id);
        chain.push(layer);
        layer = layer.parentId ? byId.get(layer.parentId) : null;
    }
    return chain.reduce((result, item) => transformPoint(result, evaluateLayerTransform(item, tick)), { ...point });
}

export function evaluateLayerParticles(layer, layers, tick = 0) {
    return (layer?.particles || []).map(point => evaluateWorldPoint(point, layer.id, layers, tick));
}
