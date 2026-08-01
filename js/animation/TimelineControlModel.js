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

export function calculateParticleCenter(particles) {
    if (!Array.isArray(particles) || particles.length === 0) return { x: 0, y: 0, z: 0 };
    const total = particles.reduce((sum, point) => ({
        x: sum.x + finite(point.x), y: sum.y + finite(point.y), z: sum.z + finite(point.z)
    }), { x: 0, y: 0, z: 0 });
    return { x: total.x / particles.length, y: total.y / particles.length, z: total.z / particles.length };
}
