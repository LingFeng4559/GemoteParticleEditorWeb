import * as THREE from 'three';

class EraserTool {
    constructor(stateManager, sceneManager, sceneSync) {
        this.stateManager = stateManager;
        this.sceneManager = sceneManager;
        this.sceneSync = sceneSync;
        this.previewMeshes = [];
        this.ERASER_RADIUS = 0.5;
    }

    eraseAtPosition(position) {
        const state = this.stateManager.getState();

        if (state.eraserMode === 'point') {
            // 點模式：擦除範圍內的個別粒子
            const pointsToRemove = state.particlePoints.filter(p => {
                const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                return position.distanceTo(pointPosition) <= this.ERASER_RADIUS;
            });
            if (pointsToRemove.length > 0) {
                this.stateManager.removePoints(pointsToRemove);
            }

            // 從群組中擦除個別粒子
            state.drawingGroups.forEach(groupData => {
                const particlesToRemove = groupData.particles.filter(p => {
                    const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                    return position.distanceTo(pointPosition) <= this.ERASER_RADIUS;
                });
                if (particlesToRemove.length > 0) {
                    const remainingParticles = groupData.particles.filter(p => {
                        const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                        return position.distanceTo(pointPosition) > this.ERASER_RADIUS;
                    });
                    if (remainingParticles.length === 0) {
                        this.stateManager.removeGroup(groupData.id);
                    } else {
                        this.stateManager.updateGroup(groupData.id, {
                            particles: remainingParticles
                        });
                    }
                }
            });
        } else if (state.eraserMode === 'group') {
            // 群組模式：擦除整個群組
            const groupsToRemove = [];
            state.drawingGroups.forEach(groupData => {
                const hasParticleInRange = groupData.particles.some(p => {
                    const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                    return position.distanceTo(pointPosition) <= this.ERASER_RADIUS;
                });
                if (hasParticleInRange) {
                    groupsToRemove.push(groupData.id);
                }
            });
            groupsToRemove.forEach(groupId => {
                this.stateManager.removeGroup(groupId);
            });

            // 也擦除獨立粒子
            const pointsToRemove = state.particlePoints.filter(p => {
                const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                return position.distanceTo(pointPosition) <= this.ERASER_RADIUS;
            });
            if (pointsToRemove.length > 0) {
                this.stateManager.removePoints(pointsToRemove);
            }
        }
    }

    updatePreview(position) {
        this.clearPreview();

        const pointsInRange = this.getPointsInRange(position);
        pointsInRange.previewPositions.forEach(previewPosition => {
            const highlightGeometry = new THREE.SphereGeometry(0.12, 16, 16);
            const highlightMaterial = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.6,
                depthTest: false,
                depthWrite: false
            });

            const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
            highlightMesh.position.copy(previewPosition);
            highlightMesh.renderOrder = 997;
            this.sceneManager.scene.add(highlightMesh);
            this.previewMeshes.push(highlightMesh);
        });
    }

    clearPreview() {
        this.previewMeshes.forEach(mesh => {
            this.sceneManager.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        this.previewMeshes = [];
    }

    getPointsInRange(position) {
        const state = this.stateManager.getState();
        const result = { previewPositions: [], groupIds: [] };

        if (state.eraserMode === 'point') {
            state.particlePoints.forEach(p => {
                const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                if (position.distanceTo(pointPosition) <= this.ERASER_RADIUS) {
                    result.previewPositions.push(pointPosition);
                }
            });

            state.drawingGroups.forEach(groupData => {
                if (!this.sceneSync.getGroup(groupData.id)) return;
                groupData.particles.forEach(particle => {
                    const pointPosition = new THREE.Vector3(particle.x, particle.y, particle.z);
                    if (position.distanceTo(pointPosition) <= this.ERASER_RADIUS) {
                        result.previewPositions.push(pointPosition);
                    }
                });
            });
        } else if (state.eraserMode === 'group') {
            state.drawingGroups.forEach(groupData => {
                const hasParticleInRange = groupData.particles.some(p => {
                    const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                    return position.distanceTo(pointPosition) <= this.ERASER_RADIUS;
                });
                if (hasParticleInRange) {
                    const group = this.sceneSync.getGroup(groupData.id);
                    if (group) {
                        result.previewPositions.push(new THREE.Vector3(group.position.x, group.position.y, group.position.z));
                        result.groupIds.push(groupData.id);
                    }
                }
            });

            state.particlePoints.forEach(p => {
                const pointPosition = new THREE.Vector3(p.x, p.y, p.z);
                if (position.distanceTo(pointPosition) <= this.ERASER_RADIUS) {
                    result.previewPositions.push(pointPosition);
                }
            });
        }

        return result;
    }
}

export default EraserTool;
