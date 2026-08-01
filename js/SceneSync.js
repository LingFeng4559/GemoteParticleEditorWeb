import * as THREE from 'three';
import DrawingGroup from './DrawingGroup.js';
import { isLayerContainer, isLayerEffectivelyVisible } from './LayerModel.js';
import { evaluateLayerParticles, evaluateLayerVisibility } from './animation/AnimationModel.js';

class SceneSync {
    constructor(stateManager, sceneManager) {
        this.stateManager = stateManager;
        this.sceneManager = sceneManager;
        this.particleObjectMap = new Map();
        this.groupObjectMap = new Map();
        this.lastGridSize = null;
    }

    createParticleCloud(groupData) {
        const particles = groupData.particles || [];
        const positions = new Float32Array(particles.length * 3);
        const colors = new Float32Array(particles.length * 3);
        const color = new THREE.Color();
        particles.forEach((particle, index) => {
            const offset = index * 3;
            positions[offset] = particle.x;
            positions[offset + 1] = particle.y;
            positions[offset + 2] = particle.z;
            color.set(particle.color || groupData.color || '#ff0000');
            colors[offset] = color.r;
            colors[offset + 1] = color.g;
            colors[offset + 2] = color.b;
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeBoundingSphere();
        const imageSpacing = Number(groupData.imageSettings?.spacing);
        const pointSize = groupData.type === 'image' && Number.isFinite(imageSpacing)
            ? Math.max(0.001, Math.min(0.25, imageSpacing * 0.92))
            : 0.13;
        const material = new THREE.PointsMaterial({
            size: pointSize,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: true
        });
        const cloud = new THREE.Points(geometry, material);
        cloud.userData.groupId = groupData.id;
        this.sceneManager.scene.add(cloud);
        return cloud;
    }

    createGroupMeshes(groupData) {
        if (!groupData.isAnimated) return [this.createParticleCloud(groupData)];
        return (groupData.particles || []).map(particle => {
            const pointVec = new THREE.Vector3(particle.x, particle.y, particle.z);
            return this.sceneManager.addPoint({ point: pointVec, color: particle.color || groupData.color });
        });
    }

    updateParticleCloud(cloud, groupData) {
        const particles = groupData.particles || [];
        const positionAttribute = cloud.geometry.getAttribute('position');
        const colorAttribute = cloud.geometry.getAttribute('color');
        if (!positionAttribute || positionAttribute.count !== particles.length || !colorAttribute) return false;

        const color = new THREE.Color();
        particles.forEach((particle, index) => {
            positionAttribute.setXYZ(index, particle.x, particle.y, particle.z);
            color.set(particle.color || groupData.color || '#ff0000');
            colorAttribute.setXYZ(index, color.r, color.g, color.b);
        });
        positionAttribute.needsUpdate = true;
        colorAttribute.needsUpdate = true;
        cloud.geometry.computeBoundingSphere();
        return true;
    }

    sync(state, { isDragging = false } = {}) {
        // 同步群組
        const stateGroupIds = new Set(state.drawingGroups.filter(g => !isLayerContainer(g)).map(g => g.id));
        const renderedGroupIds = new Set(this.groupObjectMap.keys());

        // 新增或更新群組
        for (const groupData of state.drawingGroups) {
            if (isLayerContainer(groupData)) continue;
            const evaluatedGroupData = { ...groupData, particles: evaluateLayerParticles(groupData, state.drawingGroups, state.timelineTick) };
            const shouldBeVisible = isLayerEffectivelyVisible(groupData.id, state.drawingGroups) && evaluateLayerVisibility(groupData, state.timelineTick);
            if (!renderedGroupIds.has(groupData.id)) {
                const group = DrawingGroup.fromJSON(evaluatedGroupData);

                group.meshes.push(...this.createGroupMeshes(evaluatedGroupData));

                this.groupObjectMap.set(groupData.id, group);
                group.visible = shouldBeVisible;
                group.locked = !!groupData.locked;
                group.meshes.forEach(mesh => { mesh.visible = shouldBeVisible; });
            } else {
                const group = this.groupObjectMap.get(groupData.id);
                group.visible = shouldBeVisible;
                group.locked = !!groupData.locked;
                group.meshes.forEach(mesh => { mesh.visible = shouldBeVisible; });

                // 拖動期間不覆寫本地位置
                if (isDragging && group) {
                    continue;
                }

                const cloud = group.meshes[0];
                const renderModeChanged = (!!cloud?.isPoints) === !!groupData.isAnimated;
                const needsRebuild = renderModeChanged ||
                    (groupData.isAnimated && group.meshes.length !== evaluatedGroupData.particles.length) ||
                    (!groupData.isAnimated && (!cloud || !this.updateParticleCloud(cloud, evaluatedGroupData)));
                if (needsRebuild) {
                    // 粒子數量不同，重新渲染
                    group.meshes.forEach(mesh => {
                        if (mesh.geometry) mesh.geometry.dispose();
                        if (mesh.material) mesh.material.dispose();
                        this.sceneManager.scene.remove(mesh);
                    });
                    group.meshes = [];

                    group.particles = evaluatedGroupData.particles;
                    group.bounds = group.calculateBounds();
                    group.position = group.calculateCenter();

                    group.meshes.push(...this.createGroupMeshes(evaluatedGroupData));
                    group.meshes.forEach(mesh => { mesh.visible = shouldBeVisible; });
                }
                if (group.particles.length === evaluatedGroupData.particles.length) {
                    group.particles = evaluatedGroupData.particles;
                    group.position = group.calculateCenter();
                    group.bounds = group.calculateBounds();
                    if (groupData.isAnimated && !needsRebuild) {
                        group.particles.forEach((particle, index) => {
                            const mesh = group.meshes[index];
                            if (!mesh) return;
                            mesh.position.set(particle.x, particle.y, particle.z);
                            mesh.material?.color?.set(particle.color || evaluatedGroupData.color || '#ff0000');
                        });
                    }
                    group.updateVisuals(this.sceneManager.scene);
                }
            }
        }

        // 移除已刪除的群組
        for (const id of renderedGroupIds) {
            if (!stateGroupIds.has(id)) {
                const group = this.groupObjectMap.get(id);
                group.dispose(this.sceneManager.scene);
                this.groupObjectMap.delete(id);
            }
        }

        // 同步獨立粒子點（舊系統相容）
        const statePointIds = new Set(state.particlePoints.map(p => p.id));
        const renderedPointIds = new Set(this.particleObjectMap.keys());

        for (const pointData of state.particlePoints) {
            if (!renderedPointIds.has(pointData.id)) {
                const pointVec = new THREE.Vector3(pointData.x, pointData.y, pointData.z);
                const sphereMesh = this.sceneManager.addPoint({ point: pointVec, color: pointData.color });
                this.particleObjectMap.set(pointData.id, { sphereMesh });
            }
        }

        for (const id of renderedPointIds) {
            if (!statePointIds.has(id)) {
                const { sphereMesh, lineSegment } = this.particleObjectMap.get(id);
                this.sceneManager.removeObject(sphereMesh);
                if (lineSegment) {
                    this.sceneManager.removeObject(lineSegment);
                }
                this.particleObjectMap.delete(id);
            }
        }
    }

    syncSelection(state, prevSelectedId, onSelectChange) {
        const nextSelectedId = state.selectedGroup ? state.selectedGroup.id : null;
        if (prevSelectedId !== nextSelectedId) {
            if (prevSelectedId && this.groupObjectMap.has(prevSelectedId)) {
                this.groupObjectMap.get(prevSelectedId).hideSelection(this.sceneManager.scene);
            }
            if (nextSelectedId && this.groupObjectMap.has(nextSelectedId)) {
                this.groupObjectMap.get(nextSelectedId).showSelection(this.sceneManager.scene);
            }
            onSelectChange(nextSelectedId);
        }
        return nextSelectedId;
    }

    getGroup(id) {
        return this.groupObjectMap.get(id);
    }

    getAllGroups() {
        return this.groupObjectMap.entries();
    }

    isEmpty(state) {
        return state.drawingGroups.length === 0 && state.particlePoints.length === 0;
    }
}

export default SceneSync;
