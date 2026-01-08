import { app, BrowserWindow, protocol } from 'electron'
import { createMainWindow } from './windows/mainWindow'
import { registerIpcHandlers } from './ipc'
import { registerLocalfileProtocol } from './protocols/localfile'
import { destroyTray, registerTray } from './tray'

let mainWindow: BrowserWindow | null = null

if (process.platform === 'win32') {
  // 说明：Windows 下设置 AppUserModelId，有助于任务栏图标/通知/安装包图标关联一致
  app.setAppUserModelId('com.toolsx.app')
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'localfile',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

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

app.on('before-quit', () => {
  destroyTray()
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = await createMainWindow()
  }
})

app.whenReady().then(async () => {
  registerIpcHandlers()
  registerLocalfileProtocol()
  mainWindow = await createMainWindow()
  registerTray(() => mainWindow)
})
