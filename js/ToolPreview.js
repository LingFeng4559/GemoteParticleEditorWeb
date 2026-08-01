import * as THREE from 'three';

class ToolPreview {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.mesh = null;
    }

    show(position, mode, radius) {
        this.clear();

        const { plane, normal } = this.sceneManager.getDrawingPlaneInfo();

        const colors = {
            brush: 0x00ff00, eraser: 0xff0000, point: 0x0099ff,
            rectangle: 0x00aaff, circle: 0x00aaff
        };
        const color = colors[mode] || 0xffffff;
        
        // 建立水平圓形預覽 (XZ 平面)
        const geometry = new THREE.CircleGeometry(radius, 32);
        geometry.rotateX(-Math.PI / 2); // 使其躺平
        
        const material = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.3,
            side: THREE.DoubleSide, depthTest: false, depthWrite: false
        });

        const previewPosition = position.clone().add(normal.clone().multiplyScalar(0.02));
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(previewPosition);
        this.mesh.quaternion.copy(plane.quaternion);
        this.mesh.renderOrder = 998;
        this.sceneManager.scene.add(this.mesh);

        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color, depthTest: false })
        );
        edges.position.copy(previewPosition);
        edges.quaternion.copy(plane.quaternion);
        edges.renderOrder = 999;
        this.sceneManager.scene.add(edges);

        this.mesh.userData.edgeLine = edges;
    }

    clear() {
        if (!this.mesh) return;
        if (this.mesh.userData.edgeLine) this.sceneManager.scene.remove(this.mesh.userData.edgeLine);
        this.sceneManager.scene.remove(this.mesh);
        this.mesh = null;
    }
}

export default ToolPreview;
