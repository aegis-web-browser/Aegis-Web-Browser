const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('pdfBridge', {
  open: () => ipcRenderer.invoke('pdf:open'),
  save: data => ipcRenderer.invoke('pdf:save', data)
});
