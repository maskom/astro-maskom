// Background Sync Manager for offline functionality
class BackgroundSyncManager {
  constructor() {
    this.dbName = 'maskom-offline-db';
    this.dbVersion = 1;
    this.storeName = 'pending-requests';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Create indexes for efficient querying
          store.createIndex('url', 'url', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('method', 'method', { unique: false });
        }
      };
    });
  }

  async saveRequest(url, options = {}) {
    if (!this.db) await this.init();

    const request = {
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body || null,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const addRequest = store.add(request);

      addRequest.onsuccess = () => resolve(addRequest.result);
      addRequest.onerror = () => reject(addRequest.error);
    });
  }

  async getPendingRequests() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  async removeRequest(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve(deleteRequest.result);
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  async updateRequest(id, updates) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const request = getRequest.result;
        if (request) {
          Object.assign(request, updates);
          const updateRequest = store.put(request);
          updateRequest.onsuccess = () => resolve(updateRequest.result);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Request not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async syncPendingRequests() {
    const pendingRequests = await this.getPendingRequests();
    const results = [];

    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        if (response.ok) {
          await this.removeRequest(request.id);
          results.push({ id: request.id, success: true });
        } else {
          // Update retry count
          await this.updateRequest(request.id, {
            retryCount: request.retryCount + 1,
          });
          results.push({
            id: request.id,
            success: false,
            error: `HTTP ${response.status}`,
          });
        }
      } catch (error) {
        await this.updateRequest(request.id, {
          retryCount: request.retryCount + 1,
        });
        results.push({
          id: request.id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  async clearOldRequests(maxAge = 7 * 24 * 60 * 60 * 1000) {
    // 7 days
    const pendingRequests = await this.getPendingRequests();
    const now = Date.now();

    for (const request of pendingRequests) {
      if (now - request.timestamp > maxAge) {
        await this.removeRequest(request.id);
      }
    }
  }
}

// Enhanced fetch with offline support
class OfflineFetch {
  constructor() {
    this.syncManager = new BackgroundSyncManager();
    this.init();
  }

  async init() {
    await this.syncManager.init();

    // Register for background sync if available
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('background-sync');
      });
    }

    // Sync when coming back online
    window.addEventListener('online', () => {
      this.syncPendingRequests();
    });

    // Periodic sync
    setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingRequests();
      }
    }, 60000); // Every minute
  }

  async fetch(url, options = {}) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch {
      console.log('Network request failed, saving for later:', url);

      // Save request for later sync
      if (options.method && options.method !== 'GET') {
        await this.syncManager.saveRequest(url, options);
      }

      // Return offline response
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'Permintaan disimpan dan akan dikirim saat koneksi tersedia',
          offline: true,
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  async syncPendingRequests() {
    try {
      const results = await this.syncManager.syncPendingRequests();

      // Show notifications for sync results
      results.forEach(result => {
        if (result.success) {
          this.showSyncNotification('Data berhasil disinkronkan', 'success');
        } else {
          this.showSyncNotification('Gagal sinkronisasi data', 'error');
        }
      });

      // Clean up old requests
      await this.syncManager.clearOldRequests();
    } catch (syncError) {
      console.error('Sync failed:', syncError);
    }
  }

  showSyncNotification(message) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification('Maskom Network - Sync', {
      body: message,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'sync-notification',
    });

    setTimeout(() => {
      notification.close();
    }, 3000);
  }
}

// Initialize the offline fetch manager
const offlineFetch = new OfflineFetch();

// Export for use in other scripts
window.offlineFetch = offlineFetch;
window.BackgroundSyncManager = BackgroundSyncManager;
