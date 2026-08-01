import assert from 'node:assert/strict';
import {
    getParticleSpacing,
    getPreviewAxisPositions,
    getSegmentSampleDistances,
    normalizeParticleDensity
} from '../js/DensityModel.js';

assert.equal(normalizeParticleDensity('2.5'), 2.5);
assert.equal(normalizeParticleDensity(0), 0.1);
assert.equal(normalizeParticleDensity(99), 5);
assert.equal(normalizeParticleDensity('invalid'), 1);

assert.equal(getParticleSpacing(0.5), 1);
assert.equal(getParticleSpacing(1), 0.5);
assert.equal(getParticleSpacing(2), 0.25);
assert.equal(getParticleSpacing(5), 0.1);

assert.deepEqual(getPreviewAxisPositions(1, 2), [0, 0.5, 1, 1.5, 2]);
assert.deepEqual(getPreviewAxisPositions(2, 2), [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);

assert.deepEqual(getSegmentSampleDistances(0.2, 1), []);
assert.deepEqual(getSegmentSampleDistances(0.5, 1), [0.5]);
assert.deepEqual(getSegmentSampleDistances(1.25, 2), [0.25, 0.5, 0.75, 1, 1.25]);

console.log('density-model tests passed');
