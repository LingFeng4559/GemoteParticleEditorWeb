import lang from './LanguageManager.js';
import { PROJECT_SCHEMA_VERSION } from './ProjectSchema.js';
import { parseAnnotatedYml } from './yaml/EditorAnnotations.js';

class ProjectManager {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }

    getProjectData() {
        const state = this.stateManager.getState();
        return {
            name: state.currentProjectName,
            createdAt: new Date().toISOString(),
            version: PROJECT_SCHEMA_VERSION,
            particles: state.particlePoints.map(point => ({
                id: point.id,
                x: point.x,
                y: point.y,
                z: point.z,
                particleType: point.particleType,
                color: point.color
            })),
            groups: state.drawingGroups.map(group => {
                const out = {
                    id: group.id,
                    type: group.type,
                    layerKind: group.layerKind,
                    name: group.name,
                    parentId: group.parentId,
                    visible: group.visible !== false,
                    exportEnabled: group.exportEnabled !== false,
                    locked: !!group.locked,
                    solo: !!group.solo,
                    expanded: group.expanded !== false,
                    order: group.order,
                    layerColor: group.layerColor,
                    particles: group.particles || [],
                    isAnimated: !!group.isAnimated,
                    bounds: group.bounds,
                    position: group.position,
                    source: group.source,
                    imageSettings: group.imageSettings,
                    transform: group.transform,
                    timing: group.timing,
                    tracks: group.tracks,
                    modifiers: group.modifiers
                };
                if (group.tickInterval !== undefined && group.tickInterval !== null) {
                    out.tickInterval = group.tickInterval;
                }
                return out;
            }),
            settings: {
                drawingHeight: state.drawingHeight,
                planeRotation: state.planeRotation,
                planeOffset: state.planeOffset,
                particleType: state.particleType,
                particleColor: state.particleColor,
                cameraSensitivity: state.cameraSensitivity,
                skillId: state.skillId,
                gridSize: state.gridSize,
                animationEnabled: state.animationEnabled,
                animationTickInterval: state.animationTickInterval,
                loop: state.loop,
                head: state.head,
                timelineDuration: state.timelineDuration,
                horizontalMirrorEnabled: !!state.horizontalMirrorEnabled,
                horizontalMirrorZEnabled: !!state.horizontalMirrorZEnabled,
                verticalMirrorEnabled: !!state.verticalMirrorEnabled,
                mirrorPivot: state.mirrorPivot,
                pivotFollowsPlane: !!state.pivotFollowsPlane,
                radialSymmetryEnabled: !!state.radialSymmetryEnabled,
                radialSymmetryAxis: state.radialSymmetryAxis,
                radialSymmetryMode: state.radialSymmetryMode,
                radialSymmetryCount: state.radialSymmetryCount,
                radialSymmetryOffset: state.radialSymmetryOffset,
                particleDensity: state.particleDensity,
                characterMode: state.characterMode
            }
        };
    }

    newProject() {
        if (this.stateManager.getState().hasUnsavedChanges) {
            if (!confirm(lang.get('confirm_new_project', { default: '目前專案有未儲存的變更，確定要建立新專案嗎？' }))) {
                return;
            }
        }
        this.stateManager.loadProject({ name: '未命名專案' });
    }

    saveProject() {
        const state = this.stateManager.getState();
        const projectName = state.currentProjectName.trim() || '未命名專案';

        // 更新 state 中的專案名稱以防萬一
        if(state.currentProjectName !== projectName) {
            this.stateManager.setProjectName(projectName);
        }

        const projectData = this.getProjectData();
        const dataStr = JSON.stringify(projectData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${projectName}.gemote3d`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.stateManager.setUnsavedChanges(false);
        console.log(`專案 "${projectName}" 已儲存`);
    }

    loadProject() {
        if (this.stateManager.getState().hasUnsavedChanges) {
            if (!confirm(lang.get('confirm_load_project', { default: '目前專案有未儲存的變更，確定要載入新專案嗎？' }))) {
                return;
            }
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gemote3d,.mythic3d,.json,.yml,.yaml';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const isYml = /\.ya?ml$/i.test(file.name);
                    const projectData = isYml ? parseAnnotatedYml(e.target.result) : JSON.parse(e.target.result);
                    if (isYml) projectData.name = file.name.replace(/\.ya?ml$/i, '');
                    this.stateManager.loadProject(projectData);
                    console.log(`專案 "${projectData.name}" 載入成功！`);
                } catch (error) {
                    console.error('解析專案檔案時發生錯誤:', error);
                    alert(lang.get('error_load_project', { default: '無法讀取專案檔案，請確認檔案格式是否正確。' }));
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

export default ProjectManager;
