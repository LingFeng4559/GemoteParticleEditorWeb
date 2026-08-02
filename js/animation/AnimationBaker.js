import { evaluateLayerParticles } from './AnimationModel.js';
import { isLayerContainer, isLayerEffectivelyExported } from '../LayerModel.js';

export function bakeParticleEvents(state, { maxCommands = 12000 } = {}) {
    const layers = (state.drawingGroups || []).filter(layer =>
        !isLayerContainer(layer) && isLayerEffectivelyExported(layer.id, state.drawingGroups) && layer.particles?.length
    );
    const frameInterval = Math.max(1, Math.round(Number(state.timelineFrameInterval) || 1));
    const legacyDuration = Math.max(1, Math.round(Number(state.timelineDuration) || 80));
    const frameCount = Math.max(2, Math.round(Number(state.timelineFrameCount) || (Math.round(legacyDuration / frameInterval) + 1)));
    const duration = frameInterval * (frameCount - 1);
    const animatedLayers = layers.filter(layer => layer.modifiers?.some(modifier => modifier.enabled !== false) || layer.tracks?.some(track => track.enabled !== false));
    const animatedIds = new Set(animatedLayers.map(layer => layer.id));
    const staticCommands = (state.particlePoints || []).length + layers
        .filter(layer => !animatedIds.has(layer.id))
        .reduce((sum, layer) => sum + layer.particles.length, 0);
    const animatedIdealCommands = animatedLayers.reduce((sum, layer) => sum + layer.particles.length * frameCount, 0);
    const idealCommands = staticCommands + animatedIdealCommands;
    const availableAnimatedBudget = Math.max(1, maxCommands - staticCommands);
    const animatedParticlesPerFrame = animatedLayers.reduce((sum, layer) => sum + layer.particles.length, 0);
    const maxAnimatedFrames = animatedParticlesPerFrame > 0 ? Math.floor(availableAnimatedBudget / animatedParticlesPerFrame) : 0;
    const frameStride = maxAnimatedFrames <= 1 ? frameCount - 1 : Math.max(1, Math.ceil((frameCount - 1) / (maxAnimatedFrames - 1)));
    const bakeStep = frameInterval * frameStride;
    const events = (state.particlePoints || []).map(point => ({ tick: 0, point, layerId: null }));

    for (const layer of layers) {
        const hasTimelineAnimation = layer.modifiers?.some(modifier => modifier.enabled !== false) || layer.tracks?.some(track => track.enabled !== false);
        if (hasTimelineAnimation) {
            const finalTick = maxAnimatedFrames <= 1 ? 0 : duration;
            for (let tick = 0; tick <= finalTick; tick += bakeStep) {
                for (const point of evaluateLayerParticles(layer, state.drawingGroups, tick)) events.push({ tick, point, layerId: layer.id });
            }
            if (finalTick > 0 && duration % bakeStep !== 0) {
                for (const point of evaluateLayerParticles(layer, state.drawingGroups, duration)) events.push({ tick: duration, point, layerId: layer.id });
            }
        } else if (state.animationEnabled && layer.isAnimated) {
            const interval = Math.max(0, Number(layer.tickInterval ?? state.animationTickInterval) || 1);
            evaluateLayerParticles(layer, state.drawingGroups, 0).forEach((point, index) => events.push({ tick: index * interval, point, layerId: layer.id }));
        } else {
            evaluateLayerParticles(layer, state.drawingGroups, 0).forEach(point => events.push({ tick: 0, point, layerId: layer.id }));
        }
    }
    events.sort((a, b) => a.tick - b.tick);
    return {
        events, bakeStep, frameInterval, frameCount, idealCommands, limited: idealCommands > maxCommands,
        estimatedCommands: events.length,
        estimatedBytes: events.length * 155
    };
}
