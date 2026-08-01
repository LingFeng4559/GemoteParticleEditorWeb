import * as THREE from 'three';

/**
 * 將新的水平（X/Z）與垂直（Y）鏡像狀態同步成場景中的視覺效果。
 */
class MirrorManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.horizontalMirrorMeshX = null;
        this.horizontalMirrorMeshZ = null;
        this.verticalMirrorMesh = null;
        this.pivotMesh = null;
        this.radialLines = []; // 新增：存儲放射鏡像輔助線
    }

    sync(state) {
        const { 
            horizontalMirrorEnabled, horizontalMirrorZEnabled, verticalMirrorEnabled, 
            mirrorPivot, gridSize, currentMode,
            radialSymmetryEnabled, radialSymmetryCount, radialSymmetryAxis, 
            radialSymmetryMode, radialSymmetryOffset, planeRotation
        } = state;
        const { x, y, z } = mirrorPivot;

        // --- 1. 顯示 Pivot 中心點與十字準星 ---
        const showPivot = currentMode !== 'camera';
        
        if (showPivot) {
            if (!this.pivotMesh) {
                this.pivotMesh = new THREE.Group();
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
                );
                this.pivotMesh.add(sphere);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5 });
                const size = 0.5;
                const pointsX = [new THREE.Vector3(-size, 0, 0), new THREE.Vector3(size, 0, 0)];
                const pointsY = [new THREE.Vector3(0, -size, 0), new THREE.Vector3(0, size, 0)];
                const pointsZ = [new THREE.Vector3(0, 0, -size), new THREE.Vector3(0, 0, size)];
                this.pivotMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsX), lineMat));
                this.pivotMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsY), lineMat));
                this.pivotMesh.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsZ), lineMat));
                this.sceneManager.scene.add(this.pivotMesh);
            }
            this.pivotMesh.position.set(x, y, z);
            this.pivotMesh.visible = true;
        } else if (this.pivotMesh) {
            this.pivotMesh.visible = false;
        }

        // --- 2. 軸向鏡像視覺化 ---
        if (horizontalMirrorEnabled) {
            if (!this.horizontalMirrorMeshX) {
                this.horizontalMirrorMeshX = this._createAxisLine(0x66ccff);
                this.sceneManager.scene.add(this.horizontalMirrorMeshX);
            }
            this.horizontalMirrorMeshX.position.set(x, y + 0.02, z);
            this.horizontalMirrorMeshX.scale.set(1, 1, gridSize * 2);
            this.horizontalMirrorMeshX.visible = true;
        } else if (this.horizontalMirrorMeshX) {
            this.horizontalMirrorMeshX.visible = false;
        }

        if (horizontalMirrorZEnabled) {
            if (!this.horizontalMirrorMeshZ) {
                this.horizontalMirrorMeshZ = this._createAxisLine(0x66ccff);
                this.sceneManager.scene.add(this.horizontalMirrorMeshZ);
            }
            this.horizontalMirrorMeshZ.position.set(x, y + 0.02, z);
            this.horizontalMirrorMeshZ.scale.set(1, 1, gridSize * 2);
            this.horizontalMirrorMeshZ.rotation.set(0, Math.PI / 2, 0);
            this.horizontalMirrorMeshZ.visible = true;
        } else if (this.horizontalMirrorMeshZ) {
            this.horizontalMirrorMeshZ.visible = false;
        }

        if (verticalMirrorEnabled) {
            if (!this.verticalMirrorMesh) {
                this.verticalMirrorMesh = this._createMirrorPlane(0x66ccff);
                this.sceneManager.scene.add(this.verticalMirrorMesh);
            }
            this.verticalMirrorMesh.position.set(x, y, z);
            this.verticalMirrorMesh.scale.set(gridSize, 1, gridSize);
            this.verticalMirrorMesh.visible = true;
        } else if (this.verticalMirrorMesh) {
            this.verticalMirrorMesh.visible = false;
        }

        // --- 3. 放射鏡像輔助線 ---
        this._clearRadialLines();
        if (radialSymmetryEnabled && radialSymmetryCount > 0) {
            const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
            const lineLength = gridSize * 1.5;
            const offsetRad = (radialSymmetryOffset * Math.PI) / 180;

            for (let i = 0; i < radialSymmetryCount; i++) {
                const angle = radialSymmetryMode === 'equal' 
                    ? (i / radialSymmetryCount) * Math.PI * 2 + offsetRad 
                    : i * offsetRad;

                const points = [new THREE.Vector3(0, 0, 0)];
                const dir = new THREE.Vector3();

                if (radialSymmetryAxis === 'Y') dir.set(Math.cos(angle) * lineLength, 0, Math.sin(angle) * lineLength);
                else if (radialSymmetryAxis === 'X') dir.set(0, Math.cos(angle) * lineLength, Math.sin(angle) * lineLength);
                else if (radialSymmetryAxis === 'Z') dir.set(Math.cos(angle) * lineLength, Math.sin(angle) * lineLength, 0);

                points.push(dir);
                const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
                
                // 輔助線跟隨平台旋轉
                line.position.set(x, y, z);
                line.rotation.set(
                    (planeRotation.x * Math.PI) / 180,
                    (planeRotation.y * Math.PI) / 180,
                    (planeRotation.z * Math.PI) / 180
                );

                this.sceneManager.scene.add(line);
                this.radialLines.push(line);
            }
        }
    }

    _clearRadialLines() {
        this.radialLines.forEach(line => this.sceneManager.removeObject(line));
        this.radialLines = [];
    }

    _createAxisLine(color) {
        const geom = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.5, 0, 0, 0.5], 3));
        const mat = new THREE.LineBasicMaterial({ color, linewidth: 2, transparent: true, opacity: 0.8 });
        const line = new THREE.Line(geom, mat);
        line.renderOrder = 1000;
        return line;
    }

    _createMirrorPlane(color) {
        const geom = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.renderOrder = 999;
        return mesh;
    }

    clear() {
        this._clearRadialLines();
        if (this.horizontalMirrorMeshX) { this.sceneManager.removeObject(this.horizontalMirrorMeshX); this.horizontalMirrorMeshX = null; }
        if (this.horizontalMirrorMeshZ) { this.sceneManager.removeObject(this.horizontalMirrorMeshZ); this.horizontalMirrorMeshZ = null; }
        if (this.verticalMirrorMesh) { this.sceneManager.removeObject(this.verticalMirrorMesh); this.verticalMirrorMesh = null; }
        if (this.pivotMesh) { this.sceneManager.removeObject(this.pivotMesh); this.pivotMesh = null; }
    }
}

export default MirrorManager;
