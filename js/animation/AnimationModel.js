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
    value = value && typeof value === 'object' ? value : {};
    const defaults = createDefaultTransform();
    return {
        position: normalizeVector(value.position, defaults.position),
        rotation: normalizeVector(value.rotation, defaults.rotation),
        scale: normalizeVector(value.scale, defaults.scale),
        pivot: normalizeVector(value.pivot, defaults.pivot)
    };
}

export function normalizeTiming(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    return {
        startTick: Math.max(0, number(value.startTick, 0)),
        duration: Math.max(1, number(value.duration, 80)),
        loop: Math.max(1, Math.floor(number(value.loop, 1))),
        loopMode: ['repeat', 'ping-pong', 'once'].includes(value.loopMode) ? value.loopMode : 'repeat'
    };
}

export function normalizeModifier(value = {}, index = 0) {
    value = value && typeof value === 'object' ? value : {};
    if (value.type === 'wave') {
        return { id: value.id || `wave-${index}`, type: 'wave', name: value.name || '波動', enabled: value.enabled !== false,
            axis: ['X', 'Y', 'Z'].includes(String(value.axis).toUpperCase()) ? String(value.axis).toUpperCase() : 'Y',
            amplitude: number(value.amplitude, 1), cycles: number(value.cycles, 1), phase: number(value.phase, 0),
            startTick: Math.max(0, number(value.startTick, 0)), duration: Math.max(1, number(value.duration, 80)) };
    }
    if (value.type === 'noise') {
        return { id: value.id || `noise-${index}`, type: 'noise', name: value.name || '抖動', enabled: value.enabled !== false,
            amplitude: normalizeVector(value.amplitude, { x: 0.1, y: 0.1, z: 0.1 }), frequency: Math.max(0.01, number(value.frequency, 1)), seed: number(value.seed, 1) };
    }
    if (value.type === 'orbit') {
        return {
            id: value.id || `orbit-${index}`,
            type: 'orbit', name: value.name || '公轉', enabled: value.enabled !== false,
            axis: ['X', 'Y', 'Z'].includes(String(value.axis).toUpperCase()) ? String(value.axis).toUpperCase() : 'Y',
            center: normalizeVector(value.center, { x: 0, y: 0, z: 0 }),
            radius: Math.max(0, number(value.radius, 1)),
            from: number(value.from, 0), to: number(value.to, 360),
            startTick: Math.max(0, number(value.startTick, 0)), duration: Math.max(1, number(value.duration, 80)),
            easing: ['linear', 'ease-in', 'ease-out', 'ease-in-out'].includes(value.easing) ? value.easing : 'linear',
            facePath: !!value.facePath
        };
    }
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

export function normalizeTrack(value = {}, index = 0) {
    value = value && typeof value === 'object' ? value : {};
    const keyframes = (Array.isArray(value.keyframes) ? value.keyframes : [])
        .map((keyframe, keyframeIndex) => ({
            id: keyframe.id || `key-${index}-${keyframeIndex}`,
            tick: Math.max(0, number(keyframe.tick, 0)),
            value: typeof keyframe.value === 'boolean' ? keyframe.value : number(keyframe.value, 0),
            interpolation: ['linear', 'step', 'ease-in', 'ease-out', 'ease-in-out'].includes(keyframe.interpolation)
                ? keyframe.interpolation : 'linear'
        }))
        .sort((a, b) => a.tick - b.tick);
    return {
        id: value.id || `track-${index}`,
        property: String(value.property || 'position.x'),
        enabled: value.enabled !== false,
        keyframes
    };
}

export const normalizeTracks = values => (Array.isArray(values) ? values : []).map(normalizeTrack);

function ease(progress, type) {
    const t = Math.max(0, Math.min(1, progress));
    if (type === 'ease-in') return t * t;
    if (type === 'ease-out') return 1 - (1 - t) * (1 - t);
    if (type === 'ease-in-out') return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    return t;
}

export function mapLayerTick(tick, timingValue) {
    const timing = normalizeTiming(timingValue);
    const elapsed = Math.max(0, number(tick) - timing.startTick);
    if (timing.loopMode === 'once') return Math.min(timing.duration, elapsed);
    if (timing.loopMode === 'ping-pong') {
        const total = timing.duration * 2 * timing.loop;
        if (elapsed >= total) return 0;
        const phase = elapsed % (timing.duration * 2);
        return phase <= timing.duration ? phase : timing.duration * 2 - phase;
    }
    const total = timing.duration * timing.loop;
    if (elapsed >= total) return timing.duration;
    return elapsed > 0 && elapsed % timing.duration === 0 ? timing.duration : elapsed % timing.duration;
}

export function evaluateTrack(trackValue, tick) {
    const track = normalizeTrack(trackValue);
    const keys = track.keyframes;
    if (!track.enabled || keys.length === 0) return undefined;
    if (tick <= keys[0].tick) return keys[0].value;
    if (tick >= keys[keys.length - 1].tick) return keys[keys.length - 1].value;
    const rightIndex = keys.findIndex(key => key.tick >= tick);
    const left = keys[rightIndex - 1];
    const right = keys[rightIndex];
    if (left.interpolation === 'step' || typeof left.value === 'boolean' || typeof right.value === 'boolean') return left.value;
    const progress = ease((tick - left.tick) / Math.max(0.000001, right.tick - left.tick), left.interpolation);
    return left.value + (right.value - left.value) * progress;
}

function setTransformProperty(transform, property, value) {
    const [group, key] = property.split('.');
    if (transform[group] && ['x', 'y', 'z'].includes(key) && typeof value === 'number') transform[group][key] = value;
}

export function evaluateLayerTransform(layer, tick = 0) {
    const transform = normalizeTransform(layer?.transform);
    const localTick = mapLayerTick(tick, layer?.timing);
    for (const track of normalizeTracks(layer?.tracks)) {
        setTransformProperty(transform, track.property, evaluateTrack(track, localTick));
    }
    for (const modifier of normalizeModifiers(layer?.modifiers)) {
        if (!modifier.enabled) continue;
        const progress = modifier.duration ? ease((localTick - modifier.startTick) / modifier.duration, modifier.easing) : 0;
        const angle = modifier.from !== undefined ? modifier.from + (modifier.to - modifier.from) * progress : 0;
        if (modifier.type === 'spin') transform.rotation[modifier.axis.toLowerCase()] += angle;
        if (modifier.type === 'orbit') {
            const radians = angle * Math.PI / 180;
            const c = modifier.center;
            if (modifier.axis === 'Y') {
                transform.position.x += c.x + modifier.radius * Math.cos(radians);
                transform.position.y += c.y;
                transform.position.z += c.z + modifier.radius * Math.sin(radians);
                if (modifier.facePath) transform.rotation.y += -angle;
            } else if (modifier.axis === 'X') {
                transform.position.x += c.x;
                transform.position.y += c.y + modifier.radius * Math.cos(radians);
                transform.position.z += c.z + modifier.radius * Math.sin(radians);
                if (modifier.facePath) transform.rotation.x += -angle;
            } else {
                transform.position.x += c.x + modifier.radius * Math.cos(radians);
                transform.position.y += c.y + modifier.radius * Math.sin(radians);
                transform.position.z += c.z;
                if (modifier.facePath) transform.rotation.z += angle;
            }
        }
        if (modifier.type === 'wave') {
            const radians = (modifier.phase + progress * modifier.cycles * 360) * Math.PI / 180;
            transform.position[modifier.axis.toLowerCase()] += Math.sin(radians) * modifier.amplitude;
        }
        if (modifier.type === 'noise') {
            const sample = Math.floor(localTick * modifier.frequency) + modifier.seed;
            const random = axis => {
                const value = Math.sin(sample * 12.9898 + axis * 78.233) * 43758.5453;
                return (value - Math.floor(value)) * 2 - 1;
            };
            transform.position.x += random(1) * modifier.amplitude.x;
            transform.position.y += random(2) * modifier.amplitude.y;
            transform.position.z += random(3) * modifier.amplitude.z;
        }
    }
    return transform;
}

export function evaluateLayerVisibility(layer, tick = 0) {
    const localTick = mapLayerTick(tick, layer?.timing);
    const track = normalizeTracks(layer?.tracks).find(item => item.property === 'visible');
    return track ? !!evaluateTrack(track, localTick) : layer?.visible !== false;
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
