const { app, BrowserWindow } = require('electron/main');
const { session } = require('electron');
const path = require('path');

// get working directory
// const workingDirectory = process.cwd();
// console.log(workingDirectory)

console.log(app.getAppPath());

const extPath = path.join(app.getAppPath(), 'build');

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  // load index.html when time expires

  let today = new Date();
  let expiryDate = new Date('2025-06-19'); // Set your expiry date here

  console.log('Current Date:', today);
  console.log('Expiry Date:', expiryDate);

  let isExpired = today > expiryDate

  if (isExpired) {
    console.log('Time expired, loading index.html');
    await win.loadFile('index.html');
    return
  } else {
    await win.loadURL('https://google.com');
    console.log('Time not expired, loading Google');
  }

  // Load the extension
  session.defaultSession.loadExtension(extPath).then(({ id }) => {
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
