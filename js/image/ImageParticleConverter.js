const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const DEFAULT_IMAGE_PARTICLE_OPTIONS = Object.freeze({
    alphaThreshold: 16,
    sampleStep: 1,
    spacing: 0.125,
    plane: 'XY',
    flipX: false,
    flipY: false,
    alignmentX: 'center',
    alignmentY: 'center',
    colorMode: 'source',
    singleColor: '#ff0000',
    particleType: 'redstone'
});

function getOffsets(width, height, spacing, alignmentX, alignmentY) {
    const worldWidth = Math.max(0, width - 1) * spacing;
    const worldHeight = Math.max(0, height - 1) * spacing;
    const offsetX = alignmentX === 'left' ? 0 : alignmentX === 'right' ? -worldWidth : -worldWidth / 2;
    const offsetY = alignmentY === 'bottom' ? 0 : alignmentY === 'top' ? -worldHeight : -worldHeight / 2;
    return { offsetX, offsetY, worldWidth, worldHeight };
}

function rgbToHex(r, g, b) {
    return `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

export function convertImageDataToParticles(imageData, options = {}) {
    if (!imageData || !Number.isInteger(imageData.width) || !Number.isInteger(imageData.height) || !imageData.data) {
        throw new TypeError('A valid ImageData-like object is required.');
    }

    const config = { ...DEFAULT_IMAGE_PARTICLE_OPTIONS, ...options };
    const step = clamp(Math.round(Number(config.sampleStep) || 1), 1, 64);
    const spacing = clamp(Number(config.spacing) || DEFAULT_IMAGE_PARTICLE_OPTIONS.spacing, 0.01, 10);
    const alphaThreshold = clamp(Math.round(Number(config.alphaThreshold) || 0), 0, 255);
    const sampledWidth = Math.ceil(imageData.width / step);
    const sampledHeight = Math.ceil(imageData.height / step);
    const offsets = getOffsets(sampledWidth, sampledHeight, spacing, config.alignmentX, config.alignmentY);
    const particles = [];

    for (let sy = 0; sy < sampledHeight; sy++) {
        for (let sx = 0; sx < sampledWidth; sx++) {
            const sourceX = Math.min(imageData.width - 1, (config.flipX ? sampledWidth - 1 - sx : sx) * step);
            const sourceY = Math.min(imageData.height - 1, (config.flipY ? sampledHeight - 1 - sy : sy) * step);
            const index = (sourceY * imageData.width + sourceX) * 4;
            const alpha = imageData.data[index + 3];
            if (alpha < alphaThreshold || alpha === 0) continue;

            const horizontal = offsets.offsetX + sx * spacing;
            const vertical = offsets.offsetY + (sampledHeight - 1 - sy) * spacing;
            const point = { x: 0, y: 0, z: 0 };
            if (config.plane === 'YZ') {
                point.y = horizontal;
                point.z = vertical;
            } else if (config.plane === 'ZX') {
                point.z = horizontal;
                point.x = vertical;
            } else {
                point.x = horizontal;
                point.y = vertical;
            }

            particles.push({
                ...point,
                particleType: config.particleType,
                color: config.colorMode === 'single'
                    ? config.singleColor
                    : rgbToHex(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]),
                sourcePixel: { x: sourceX, y: sourceY }
            });
        }
    }

    return {
        particles,
        sourceSize: { width: imageData.width, height: imageData.height },
        sampledSize: { width: sampledWidth, height: sampledHeight },
        worldSize: { width: offsets.worldWidth, height: offsets.worldHeight },
        options: { ...config, sampleStep: step, spacing, alphaThreshold }
    };
}

