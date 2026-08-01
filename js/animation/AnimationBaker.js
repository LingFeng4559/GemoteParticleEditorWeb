import { evaluateLayerParticles } from './AnimationModel.js';
import { isLayerContainer, isLayerEffectivelyExported } from '../LayerModel.js';

export function bakeParticleEvents(state, { maxCommands = 12000 } = {}) {
    const layers = (state.drawingGroups || []).filter(layer =>
        !isLayerContainer(layer) && isLayerEffectivelyExported(layer.id, state.drawingGroups) && layer.particles?.length
    );
    const duration = Math.max(1, Math.round(Number(state.timelineDuration) || 80));
    const animatedLayers = layers.filter(layer => layer.modifiers?.some(modifier => modifier.enabled !== false) || layer.tracks?.some(track => track.enabled !== false));
    const animatedIds = new Set(animatedLayers.map(layer => layer.id));
    const staticCommands = (state.particlePoints || []).length + layers
        .filter(layer => !animatedIds.has(layer.id))
        .reduce((sum, layer) => sum + layer.particles.length, 0);
    const animatedIdealCommands = animatedLayers.reduce((sum, layer) => sum + layer.particles.length * (duration + 1), 0);
    const idealCommands = staticCommands + animatedIdealCommands;
    const availableAnimatedBudget = Math.max(1, maxCommands - staticCommands);
    const animatedParticlesPerFrame = animatedLayers.reduce((sum, layer) => sum + layer.particles.length, 0);
    const maxAnimatedFrames = animatedParticlesPerFrame > 0 ? Math.floor(availableAnimatedBudget / animatedParticlesPerFrame) : 0;
    const bakeStep = maxAnimatedFrames <= 1 ? duration : Math.max(1, Math.ceil(duration / (maxAnimatedFrames - 1)));
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
        events, bakeStep, idealCommands, limited: idealCommands > maxCommands,
        estimatedCommands: events.length,
        estimatedBytes: events.length * 155
    };
}
