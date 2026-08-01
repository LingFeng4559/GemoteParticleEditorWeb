export function clientToNdc(clientX, clientY, rect) {
    const width = Math.max(1, Number(rect?.width) || 0);
    const height = Math.max(1, Number(rect?.height) || 0);
    const left = Number(rect?.left) || 0;
    const top = Number(rect?.top) || 0;
    return {
        x: ((Number(clientX) - left) / width) * 2 - 1,
        y: -((Number(clientY) - top) / height) * 2 + 1
    };
}

export function projectedToClient(projectedX, projectedY, rect) {
    const width = Math.max(1, Number(rect?.width) || 0);
    const height = Math.max(1, Number(rect?.height) || 0);
    return {
        x: (Number(rect?.left) || 0) + (Number(projectedX) + 1) * .5 * width,
        y: (Number(rect?.top) || 0) + (1 - Number(projectedY)) * .5 * height
    };
}
