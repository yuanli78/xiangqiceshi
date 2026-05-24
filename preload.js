const { contextBridge } = require('electron');

// Expose any APIs to the renderer process if needed in the future
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform
});
