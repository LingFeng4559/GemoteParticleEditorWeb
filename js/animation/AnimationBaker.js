import { evaluateLayerParticles } from './AnimationModel.js';
import { isLayerContainer, isLayerEffectivelyExported } from '../LayerModel.js';

export function bakeParticleEvents(state, { maxCommands = 12000 } = {}) {
    const layers = (state.drawingGroups || []).filter(layer =>
        !isLayerContainer(layer) && isLayerEffectivelyExported(layer.id, state.drawingGroups) && layer.particles?.length
    );
    const duration = Math.max(1, Math.round(Number(state.timelineDuration) || 80));
    const animatedLayers = layers.filter(layer => layer.modifiers?.some(modifier => modifier.enabled !== false));
    const idealCommands = animatedLayers.reduce((sum, layer) => sum + layer.particles.length * (duration + 1), 0);
    const bakeStep = Math.max(1, Math.ceil(idealCommands / Math.max(1, maxCommands)));
    const events = (state.particlePoints || []).map(point => ({ tick: 0, point, layerId: null }));

    for (const layer of layers) {
        const hasModifiers = layer.modifiers?.some(modifier => modifier.enabled !== false);
        if (hasModifiers) {
            for (let tick = 0; tick <= duration; tick += bakeStep) {
                for (const point of evaluateLayerParticles(layer, state.drawingGroups, tick)) events.push({ tick, point, layerId: layer.id });
            }
            if (duration % bakeStep !== 0) {
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
    return { events, bakeStep, idealCommands, limited: idealCommands > maxCommands };
}
