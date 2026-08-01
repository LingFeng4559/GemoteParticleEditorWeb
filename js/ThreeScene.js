import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class ThreeScene {
    constructor(canvas) {
        this.canvas = canvas;
        this.particlePoints = [];
        this.gridSize = 10;
        this.init();
    }

    init() {
        console.log('[ThreeScene] 正在初始化 3D 場景...');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);

        try {
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
            console.log('[ThreeScene] WebGL 渲染器創建成功。');
        } catch (e) {
            console.error('[ThreeScene] WebGL 渲染器創建失敗:', e);
            alert('您的瀏覽器似乎不支援 WebGL，請檢查硬體加速設定。');
            return;
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = false;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.epsilon = 0.01;

        this.setupSceneElements();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupSceneElements() {
        this.gridHelper = new THREE.GridHelper(this.gridSize, this.gridSize, 0x444444, 0x222222);
        this.scene.add(this.gridHelper);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dl = new THREE.DirectionalLight(0xffffff, 0.6);
        dl.position.set(10, 20, 10);
        this.scene.add(dl);

        // 建立繪圖平面：將幾何體旋轉為 XZ 平面 (水平)
        const planeGeo = new THREE.PlaneGeometry(100, 100);
        planeGeo.rotateX(-Math.PI / 2); // 直接旋轉頂點數據，使 (x, z) 成為本地平面
        
        this.dynamicTargetPlane = new THREE.Mesh(
            planeGeo,
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
        );
        this.scene.add(this.dynamicTargetPlane);

        this.heightGridHelper = new THREE.GridHelper(this.gridSize, this.gridSize, 0x0099ff, 0x0099ff);
        this.heightGridHelper.material.transparent = true;
        this.heightGridHelper.material.opacity = 0.3;
        this.heightGridHelper.visible = false;
        this.scene.add(this.heightGridHelper);

        this._createReferenceCharacter();
    }

    _createReferenceCharacter() {
        this.characterGroup = new THREE.Group();
        
        const loader = new THREE.TextureLoader();
        const texture = loader.load('steve.png');
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;

        const createBox = (w, h, d, uvCoords) => {
            const geometry = new THREE.BoxGeometry(w, h, d);
            const material = new THREE.MeshLambertMaterial({ map: texture, transparent: true, opacity: 1.0 });
            const mesh = new THREE.Mesh(geometry, material);
            
            // 簡易 UV 映射 (依照 Minecraft Skin 標準佈局)
            const uvAttribute = geometry.attributes.uv;
            for (let i = 0; i < uvAttribute.count; i++) {
                let u = uvAttribute.getX(i);
                let v = uvAttribute.getY(i);
                // 這裡僅作示意，實際精確 UV 需要計算各面偏移。
                // 為了快速呈現，我們讓頭部呈現正面臉孔。
            }
            
            return mesh;
        };

        // Minecraft 1:1 比例：1 像素 = 1/16 單位 = 0.0625
        // 總高 32 像素 = 2.0 單位 (雖然規格說 1.8，但在 MC 中 Steve 是 2 格高)
        // 腳: 12px = 0.75, 身體: 12px = 0.75, 頭: 8px = 0.5. 總計 1.8 單位的高度調整如下：
        
        const scale = 1.8 / 32; // 將原 32px 縮放至 1.8 單位
        const unit = 0.0625 * (1.8 / 2.0);

        const createPart = (pw, ph, pd, u, v, x, y, z) => {
            const w = pw * unit;
            const h = ph * unit;
            const d = pd * unit;
            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = new THREE.MeshLambertMaterial({ map: texture, transparent: true });
            const mesh = new THREE.Mesh(geo, mat);
            
            // 精確 UV 計算 (Minecraft 64x64 skin)
            const tw = 64; const th = 64;
            const setFaceUV = (faceIdx, fx, fy, fw, fh) => {
                const u1 = fx / tw; const v1 = 1 - (fy + fh) / th;
                const u2 = (fx + fw) / tw; const v2 = 1 - fy / th;
                const uvs = [u1, v2, u2, v2, u1, v1, u2, v1];
                for(let i=0; i<4; i++) {
                    geo.attributes.uv.setXY(faceIdx * 4 + i, uvs[i*2], uvs[i*2+1]);
                }
            };

            // Minecraft Skin UV 佈局
            setFaceUV(0, u+pd+pw, v+pd, pd, ph); // Right
            setFaceUV(1, u, v+pd, pd, ph);       // Left
            setFaceUV(2, u+pd, v, pw, pd);       // Top
            setFaceUV(3, u+pd+pw, v, pw, pd);    // Bottom
            setFaceUV(4, u+pd, v+pd, pw, ph);    // Front
            setFaceUV(5, u+2*pd+pw, v+pd, pw, ph); // Back

            mesh.position.set(x * unit, y * unit + h/2, z * unit);
            this.characterGroup.add(mesh);
            return mesh;
        };

        // 腳
        createPart(4, 12, 4, 0, 16, -2, 0, 0); // 左 (在 MC 中是右腳，這裡簡化)
        createPart(4, 12, 4, 16, 48, 2, 0, 0); // 右
        // 身體
        createPart(8, 12, 4, 16, 16, 0, 12, 0);
        // 手
        createPart(4, 12, 4, 40, 16, -6, 12, 0);
        createPart(4, 12, 4, 32, 48, 6, 12, 0);
        // 頭
        createPart(8, 8, 8, 0, 0, 0, 24, 0);
        
        this.scene.add(this.characterGroup);
    }

    updateCharacterMode(mode) {
        if (!this.characterGroup) return;
        console.log(`[ThreeScene] 切換參考模型模式: ${mode}`);

        if (mode === 'hidden') {
            this.characterGroup.visible = false;
        } else {
            this.characterGroup.visible = true;
            const isGhost = mode === 'ghost';
            const opacity = isGhost ? 0.2 : 1.0;
            const depthWrite = !isGhost;

            this.characterGroup.traverse(child => {
                if (child.isMesh) {
                    child.material.opacity = opacity;
                    child.material.depthWrite = depthWrite;
                    child.material.transparent = true;
                    child.material.needsUpdate = true;
                }
            });
        }
    }

    addPoint(pointData) {
        const { point, color, opacity = 1.0 } = pointData;
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 12, 12),
            new THREE.MeshBasicMaterial({ color, transparent: opacity < 1.0, opacity })
        );
        sphere.position.copy(point);
        sphere.position.y += this.epsilon; // 微移避開平面
        this.scene.add(sphere);
        return sphere;
    }

    removeObject(obj) {
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
        this.scene.remove(obj);
    }

    getIntersectPoint(event, height, rotation, offset, isFine) {
        const hit = this.getRawIntersectPoint(event, height, rotation, offset);
        if (hit) {
            // 邊界檢查：僅允許在網格範圍內繪製 (gridSize / 2)
            const localHit = this.dynamicTargetPlane.worldToLocal(hit.clone());
            const halfSize = this.gridSize / 2;
            if (Math.abs(localHit.x) > halfSize + 0.01 || Math.abs(localHit.z) > halfSize + 0.01) {
                return null;
            }

            const step = isFine ? 0.1 : 0.5;
            
            // 如果旋轉為 0，直接在世界 XZ 吸附
            if (rotation.x === 0 && rotation.y === 0 && rotation.z === 0) {
                const sx = Math.round((hit.x - offset.x) / step) * step + offset.x;
                const sz = Math.round((hit.z - offset.z) / step) * step + offset.z;
                return new THREE.Vector3(sx, height, sz);
            }
            
            // 有旋轉時，轉到本地座標吸附：因為幾何體已 rotateX(-90)，本地 (x, z) 就是平面座標
            const local = this.dynamicTargetPlane.worldToLocal(hit.clone());
            local.x = Math.round(local.x / step) * step;
            local.z = Math.round(local.z / step) * step;
            local.y = 0; 
            
            return this.dynamicTargetPlane.localToWorld(local);
        }
        return null;
    }

    getRawIntersectPoint(event, height, rotation, offset) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        this.dynamicTargetPlane.position.set(offset.x, height, offset.z);
        this.dynamicTargetPlane.rotation.set(0, 0, 0); 
        this.dynamicTargetPlane.rotateX((rotation.x * Math.PI) / 180);
        this.dynamicTargetPlane.rotateY((rotation.y * Math.PI) / 180);
        this.dynamicTargetPlane.rotateZ((rotation.z * Math.PI) / 180);
        this.dynamicTargetPlane.updateMatrixWorld(true);
        
        const intersects = this.raycaster.intersectObject(this.dynamicTargetPlane, false);
        return intersects.length > 0 ? intersects[0].point : null;
    }

    updatePlaneRotation(rot) {
        if (this.heightGridHelper) {
            this.heightGridHelper.rotation.set(0, 0, 0);
            this.heightGridHelper.rotateX((rot.x * Math.PI) / 180);
            this.heightGridHelper.rotateY((rot.y * Math.PI) / 180);
            this.heightGridHelper.rotateZ((rot.z * Math.PI) / 180);
        }
    }

    updatePlaneOffset(off) {
        this.dynamicTargetPlane.position.x = off.x;
        this.dynamicTargetPlane.position.z = off.z;
        if (this.heightGridHelper) {
            this.heightGridHelper.position.x = off.x;
            this.heightGridHelper.position.z = off.z;
        }
    }

    updateHeight(h) {
        this.dynamicTargetPlane.position.y = h;
        if (this.heightGridHelper) {
            this.heightGridHelper.position.y = h;
            this.heightGridHelper.visible = true; // 高度為 0 且有旋轉時仍需顯示
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }

    updateCameraSensitivity(s) {
        this.controls.rotateSpeed = s;
        this.controls.zoomSpeed = s;
        this.controls.panSpeed = s;
    }

    updateGridSize(size) {
        this.gridSize = size;
        this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(size, size, 0x444444, 0x222222);
        this.scene.add(this.gridHelper);
    }

    setControlsEnabled(enabled) {
        if (this.controls) {
            this.controls.enabled = enabled;
        }
    }

    getDrawingPlaneInfo() {
        const plane = this.dynamicTargetPlane;
        plane.updateMatrixWorld(true);
        // 幾何體躺平，法線即為本地 Y 軸
        const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(plane.quaternion).normalize();
        return {
            plane, normal,
            worldToPlane: p => plane.worldToLocal(p.clone()),
            planeToWorld: p => plane.localToWorld(p.clone())
        };
    }
}

export default ThreeScene;
