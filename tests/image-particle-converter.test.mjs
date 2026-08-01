import assert from 'node:assert/strict';
import { convertImageDataToParticles } from '../js/image/ImageParticleConverter.js';

const image = {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray([
        255, 0, 0, 255,   0, 255, 0, 255,
        0, 0, 255, 0,     255, 255, 255, 255
    ])
};

const result = convertImageDataToParticles(image, { spacing: 1, plane: 'XY', alphaThreshold: 1 });
assert.equal(result.particles.length, 3);
assert.deepEqual(result.worldSize, { width: 1, height: 1 });
assert.deepEqual(result.particles[0], {
    x: -0.5, y: 0.5, z: 0,
    particleType: 'redstone', color: '#ff0000', sourcePixel: { x: 0, y: 0 }
});

const yz = convertImageDataToParticles(image, { spacing: 1, plane: 'YZ', alphaThreshold: 1, colorMode: 'single', singleColor: '#123456' });
assert.equal(yz.particles[0].x, 0);
assert.equal(yz.particles[0].color, '#123456');

const sampled = convertImageDataToParticles(image, { sampleStep: 2, alphaThreshold: 1 });
assert.equal(sampled.sampledSize.width, 1);
assert.equal(sampled.particles.length, 1);

assert.throws(() => convertImageDataToParticles(null), TypeError);
console.log('image-particle-converter tests passed');
