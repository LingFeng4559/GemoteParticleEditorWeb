export const PROJECT_SCHEMA_VERSION = '3.0';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Normalize legacy project files before they enter StateManager.
 * Unknown fields are intentionally preserved so future/editor-specific data
 * can survive a load-save round trip.
 */
export function migrateProject(projectData) {
    if (!isObject(projectData)) {
        throw new TypeError('Project data must be an object.');
    }

    const migrated = {
        ...projectData,
        name: typeof projectData.name === 'string' ? projectData.name : '未命名專案',
        version: PROJECT_SCHEMA_VERSION,
        particles: Array.isArray(projectData.particles) ? projectData.particles : [],
        groups: Array.isArray(projectData.groups) ? projectData.groups : [],
        settings: isObject(projectData.settings) ? { ...projectData.settings } : {}
    };

    // Versions up to 2.1 did not serialize these values consistently. Keep
    // deterministic defaults while preserving values when they are present.
    const defaults = {
        planeOffset: { x: 0, z: 0 },
        mirrorPivot: { x: 0, y: 0, z: 0 },
        pivotFollowsPlane: true,
        radialSymmetryEnabled: false,
        radialSymmetryAxis: 'Y',
        radialSymmetryMode: 'equal',
        radialSymmetryCount: 4,
        radialSymmetryOffset: 0,
        particleDensity: 1,
        characterMode: 'opaque'
    };

    for (const [key, value] of Object.entries(defaults)) {
        if (migrated.settings[key] === undefined) {
            migrated.settings[key] = value;
        }
    }

    return migrated;
}

