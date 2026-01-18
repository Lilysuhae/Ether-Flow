const { ipcRenderer } = require('electron');

async function checkActiveWindow(workApps) {
    const win = await ipcRenderer.invoke('get-active-window');
    if (!win) return { name: "알 수 없음", isWorking: false };

    const appName = win.owner.name;
    const isWorking = workApps.some(app => appName.includes(app));
    
    return { name: appName, isWorking };
}

module.exports = { checkActiveWindow };