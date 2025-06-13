const { app, BrowserWindow } = require('electron/main');
const { session } = require('electron');

// get working directory
const workingDirectory = process.cwd();
console.log(workingDirectory)

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  await win.loadURL('https://google.com');
  session.defaultSession
    .loadExtension(
      workingDirectory + '/build'
    )
    .then(({ id }) => {
      console.log(`Extension loaded with ID: ${id}`);
      // After loading the extension, open the popup.html directly
      const extensionId = id; // Replace with actual ID from console log
      const popupUrl = `chrome-extension://${extensionId}/popup.html`;
      const popupWin = new BrowserWindow({ width: 300, height: 600 });
      popupWin.loadURL(popupUrl);
    });
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
