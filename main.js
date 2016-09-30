const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({width: 1200, height: 800});
	mainWindow.setMenu(null);
	//mainWindow.webContents.openDevTools();
	mainWindow.loadURL(`file://${__dirname}/recording.html`);
	
	mainWindow.on('closed', function() {
		mainWindow = null;
	});
}

app.on('ready', createWindow);

app.on('window-all-closed', function() {
	if(process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function() {
	if(mainWindow == null) {
		createWindow();
	}
});