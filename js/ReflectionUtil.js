import * as THREE from 'three';

/**
 * 鏡像工具：提供水平（X軸、Z軸）與垂直（Y軸）鏡像，以及放射對稱。
 */

/**
 * 將一組粒子根據鏡像與放射對稱設定展開。
 * 
 * @param {Array} particles - 原始粒子陣列（{id?, x, y, z, particleType, color}）
 * @param {Object} settings - 鏡像與對稱設定
 * @returns {Array} 展開後的粒子陣列
 */
export function reflectParticles(particles, settings = {}) {
    const { 
        horizontalX = false, 
        horizontalZ = false, 
        vertical = false, 
        mirrorPivot = { x: 0, y: 0, z: 0 },
        radialSymmetryEnabled = false,
        radialSymmetryAxis = 'Y',
        radialSymmetryMode = 'equal',
        radialSymmetryCount = 4,
        radialSymmetryOffset = 0,
        planeRotation = { x: 0, y: 0, z: 0 }
    } = settings;
    
    const centerX = mirrorPivot.x;
    const centerY = mirrorPivot.y;
    const centerZ = mirrorPivot.z;

    let result = particles.slice();

    // 1. 放射鏡像 (Radial Symmetry)
    if (radialSymmetryEnabled && radialSymmetryCount > 1) {
        const baseParticles = result.slice();
        result = [];
        
        const count = radialSymmetryCount;
        const offsetRad = (radialSymmetryOffset * Math.PI) / 180;
        let angleStep;
        
        if (radialSymmetryMode === 'equal') {
            angleStep = (2 * Math.PI) / count;
        } else {
            angleStep = (radialSymmetryOffset * Math.PI) / 180;
        }

        // 平台旋轉處理
        const planeEuler = new THREE.Euler(
            (planeRotation.x * Math.PI) / 180,
            (planeRotation.y * Math.PI) / 180,
            (planeRotation.z * Math.PI) / 180
        );
        const planeQuat = new THREE.Quaternion().setFromEuler(planeEuler);
        const invPlaneQuat = planeQuat.clone().invert();

        for (let i = 0; i < count; i++) {
            const currentAngle = (radialSymmetryMode === 'equal' ? offsetRad : 0) + i * angleStep;
            
            // 本地軸向旋轉
            const rotationQuat = new THREE.Quaternion();
            const axisVec = new THREE.Vector3(
                radialSymmetryAxis === 'X' ? 1 : 0,
                radialSymmetryAxis === 'Y' ? 1 : 0,
                radialSymmetryAxis === 'Z' ? 1 : 0
            );
            rotationQuat.setFromAxisAngle(axisVec, currentAngle);

            for (const p of baseParticles) {
                const vec = new THREE.Vector3(p.x - centerX, p.y - centerY, p.z - centerZ);
                
                // 1. 轉回本地 (取消平台旋轉)
                vec.applyQuaternion(invPlaneQuat);
                
                // 2. 應用放射旋轉
                vec.applyQuaternion(rotationQuat);
                
                // 3. 轉回世界 (恢復平台旋轉)
                vec.applyQuaternion(planeQuat);

                result.push({
                    ...p,
                    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${p.id || 'p'}_r${i}`,
                    x: vec.x + centerX,
                    y: vec.y + centerY,
                    z: vec.z + centerZ
                });
            }
        }
    }

    // 2. 軸向鏡像 (Axial Mirror) - 疊加設計
    // 註：軸向鏡像目前維持世界座標軸，因為其通常與格線對齊
    if (horizontalX) {
        const additions = [];
        for (const p of result) {
            additions.push({
                ...p,
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${p.id || 'p'}_hx`,
                x: 2 * centerX - p.x
            });
        }
        result = result.concat(additions);
    }

    if (horizontalZ) {
        const additions = [];
        for (const p of result) {
            additions.push({
                ...p,
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${p.id || 'p'}_hz`,
                z: 2 * centerZ - p.z
            });
        }
        result = result.concat(additions);
    }

    if (vertical) {
        const additions = [];
        for (const p of result) {
            additions.push({
                ...p,
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${p.id || 'p'}_v`,
                y: 2 * centerY - p.y
            });
        }
        result = result.concat(additions);
    }

    return result;
}

/**
 * 對單一粒子做鏡像展開。
 */
export function reflectSingleParticle(particle, settings) {
    return reflectParticles([particle], settings);
}
