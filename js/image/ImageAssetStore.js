const DB_NAME = 'gemote-particle-assets';
const STORE_NAME = 'images';

export class ImageAssetStore {
    constructor(indexedDb = globalThis.indexedDB) {
        this.indexedDb = indexedDb;
    }

    open() {
        if (!this.indexedDb) return Promise.reject(new Error('此瀏覽器不支援 IndexedDB'));
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const request = this.indexedDb.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('name', 'name');
                store.createIndex('updatedAt', 'updatedAt');
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return this.dbPromise;
    }

    async transact(mode, operation) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);
            const request = operation(store);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    put(asset) { return this.transact('readwrite', store => store.put(asset)); }
    list() { return this.transact('readonly', store => store.getAll()); }
    delete(id) { return this.transact('readwrite', store => store.delete(id)); }
    clear() { return this.transact('readwrite', store => store.clear()); }
}

export async function createThumbnailBlob(file, size = 96) {
    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, size, size);
        context.drawImage(bitmap, Math.floor((size - width) / 2), Math.floor((size - height) / 2), width, height);
        const thumbnail = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        return { thumbnail, width: bitmap.width, height: bitmap.height };
    } finally { bitmap.close(); }
}
