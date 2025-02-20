"use strict";
const require$$3 = require("electron");
const path = require("path");
const vendor = require("./vendor-aKxZ_xpE.js");
vendor.mainExports.initialize();
function createWindow() {
  const win = new require$$3.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  vendor.mainExports.enable(win.webContents);
}
require$$3.app.whenReady().then(() => {
  createWindow();
  require$$3.app.on("activate", () => {
    if (require$$3.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
require$$3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    require$$3.app.quit();
  }
});
