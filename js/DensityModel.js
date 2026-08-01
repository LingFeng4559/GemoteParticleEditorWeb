export const BASE_PARTICLE_SPACING = 0.5;
export const MIN_PARTICLE_DENSITY = 0.1;
export const MAX_PARTICLE_DENSITY = 5;

export function normalizeParticleDensity(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(MIN_PARTICLE_DENSITY, Math.min(MAX_PARTICLE_DENSITY, parsed));
}

export function getParticleSpacing(density) {
    return BASE_PARTICLE_SPACING / normalizeParticleDensity(density);
}

export function getPreviewAxisPositions(density, worldSize = 2) {
    const spacing = getParticleSpacing(density);
    const steps = Math.max(1, Math.ceil(worldSize / spacing));
    return Array.from({ length: steps + 1 }, (_, index) => index / steps * worldSize);
}

export function getSegmentSampleDistances(distance, density) {
    const spacing = getParticleSpacing(density);
    if (!Number.isFinite(distance) || distance < spacing) return [];
    const count = Math.floor((distance + 1e-9) / spacing);
    return Array.from({ length: count }, (_, index) => (index + 1) * spacing);
}
