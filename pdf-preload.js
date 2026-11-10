const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('pdfBridge', {
  open: () => ipcRenderer.invoke('pdf:open'),
  onInitialFile: callback => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('pdf:initial-file', (_event, pathname) => callback(pathname));
  },
  readInitial: pathname => ipcRenderer.invoke('pdf:read-initial', pathname),
  save: data => ipcRenderer.invoke('pdf:save', data)
});
