import { ipcMain } from 'electron'
import { registerSystemIpc } from './system'
import { registerWindowIpc } from './window'
import { registerFilesIpc } from './files'
import { registerVideoToGifIpc } from './videoToGif'

export function registerIpcHandlers(): void {
  ipcMain.removeHandler('system:ping')
  ipcMain.removeHandler('window:minimize')
  ipcMain.removeHandler('window:toggleMaximize')
  ipcMain.removeHandler('window:close')
  ipcMain.removeHandler('window:isMaximized')
  ipcMain.removeHandler('files:openVideo')
  ipcMain.removeHandler('videoToGif:convert')

  registerSystemIpc()
  registerWindowIpc()
  registerFilesIpc()
  registerVideoToGifIpc()
}
