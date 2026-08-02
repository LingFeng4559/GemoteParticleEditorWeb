import { normalizeModifier, normalizeTransform } from './AnimationModel.js';

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function buildTransformFromValues(currentTransform, values = {}) {
    const transform = normalizeTransform(currentTransform);
    for (const path of ['position.x', 'position.y', 'position.z', 'rotation.x', 'rotation.y', 'rotation.z', 'scale.x', 'scale.y', 'scale.z', 'pivot.x', 'pivot.y', 'pivot.z']) {
        if (!Object.prototype.hasOwnProperty.call(values, path)) continue;
        const [group, key] = path.split('.');
        transform[group][key] = finite(values[path], transform[group][key]);
    }
    return transform;
}

export function buildSpinModifier(current, values = {}, idFactory = () => crypto.randomUUID()) {
    return normalizeModifier({
        id: current?.id || idFactory(),
        type: 'spin',
        name: current?.name || '旋轉',
        enabled: values.enabled ?? current?.enabled ?? false,
        axis: values.axis ?? current?.axis ?? 'Y',
        from: finite(values.from, current?.from ?? 0),
        to: finite(values.to, current?.to ?? 360),
        startTick: Math.max(0, finite(values.startTick, current?.startTick ?? 0)),
        duration: Math.max(1, finite(values.duration, current?.duration ?? 80)),
        easing: values.easing ?? current?.easing ?? 'linear'
    });
}

export function replaceModifierByType(modifiers, modifier) {
    return [...(modifiers || []).filter(item => item.type !== modifier.type), modifier];
}

export function removeModifierByType(modifiers, type) {
    return (modifiers || []).filter(item => item.type !== type);
}

export function removeTimelineItem(items, id) {
    return (items || []).filter(item => item.id !== id);
}

export function spinDirection(from, to) {
    return finite(to, 360) - finite(from, 0) < 0 ? 'left' : 'right';
}

export function applySpinDirection(from, to, direction) {
    const start = finite(from, 0);
    const distance = Math.abs(finite(to, start + 360) - start) || 360;
    return start + (direction === 'left' ? -distance : distance);
}

export function advanceTimelineTick(currentTick, elapsedFrames, frameInterval, duration) {
    const interval = Math.max(1, finite(frameInterval, 1));
    const totalDuration = Math.max(interval, finite(duration, interval));
    const next = Math.max(0, finite(currentTick)) + Math.max(0, Math.floor(finite(elapsedFrames))) * interval;
    return next >= totalDuration ? next % totalDuration : next;
}

export function buildOrbitModifier(current, values = {}, idFactory = () => crypto.randomUUID()) {
    return normalizeModifier({
        id: current?.id || idFactory(), type: 'orbit', name: current?.name || '公轉',
        enabled: values.enabled ?? current?.enabled ?? false,
        axis: values.axis ?? current?.axis ?? 'Y', center: values.center ?? current?.center,
        radius: finite(values.radius, current?.radius ?? 1), from: finite(values.from, current?.from ?? 0),
        to: finite(values.to, current?.to ?? 360), startTick: finite(values.startTick, current?.startTick ?? 0),
        duration: finite(values.duration, current?.duration ?? 80), easing: values.easing ?? current?.easing ?? 'linear',
        facePath: values.facePath ?? current?.facePath ?? false
    });
}

export function upsertTransformKeyframes(tracks, transformValue, tick, idFactory = () => crypto.randomUUID()) {
    const transform = normalizeTransform(transformValue);
    const next = (tracks || []).map(track => ({ ...track, keyframes: [...(track.keyframes || [])] }));
    for (const group of ['position', 'rotation', 'scale']) {
        for (const key of ['x', 'y', 'z']) {
            const property = `${group}.${key}`;
            let track = next.find(item => item.property === property);
            if (!track) {
                track = { id: idFactory(), property, enabled: true, keyframes: [] };
                next.push(track);
            }
            const frame = { id: idFactory(), tick: Math.max(0, finite(tick)), value: transform[group][key], interpolation: 'linear' };
            const index = track.keyframes.findIndex(item => item.tick === frame.tick);
            if (index >= 0) track.keyframes[index] = { ...track.keyframes[index], ...frame, id: track.keyframes[index].id };
            else track.keyframes.push(frame);
            track.keyframes.sort((a, b) => a.tick - b.tick);
        }
    }
    return next;
}

export function removeKeyframesAtTick(tracks, tick) {
    const target = finite(tick);
    return (tracks || []).map(track => ({ ...track, keyframes: (track.keyframes || []).filter(frame => frame.tick !== target) }));
}

export function calculateParticleCenter(particles) {
    if (!Array.isArray(particles) || particles.length === 0) return { x: 0, y: 0, z: 0 };
    const total = particles.reduce((sum, point) => ({
        x: sum.x + finite(point.x), y: sum.y + finite(point.y), z: sum.z + finite(point.z)
    }), { x: 0, y: 0, z: 0 });
    return { x: total.x / particles.length, y: total.y / particles.length, z: total.z / particles.length };
}
