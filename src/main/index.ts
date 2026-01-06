import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './windows/mainWindow'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = await createMainWindow()
  }
})

app.whenReady().then(async () => {
  registerIpcHandlers()
  mainWindow = await createMainWindow()
})
