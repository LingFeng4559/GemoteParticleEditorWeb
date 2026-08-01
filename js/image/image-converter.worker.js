import { convertImageDataToParticles } from './ImageParticleConverter.js';

self.onmessage = event => {
    const { id, imageData, options } = event.data;
    try {
        const result = convertImageDataToParticles(imageData, options);
        self.postMessage({ id, result });
    } catch (error) {
        self.postMessage({ id, error: error.message || String(error) });
    }
};
