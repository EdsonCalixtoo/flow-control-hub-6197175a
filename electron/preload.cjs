const { contextBridge } = require('electron');

// Expose safe APIs to the frontend process
contextBridge.exposeInMainWorld('electronAPI', {
  // Safe APIs can be defined here if needed
});
