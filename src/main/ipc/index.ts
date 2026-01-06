import { ipcMain } from 'electron'
import { registerSystemIpc } from './system'
import { registerWindowIpc } from './window'
import { registerFilesIpc } from './files'
import { registerVideoToGifIpc } from './videoToGif'
import { registerImageConvertIpc } from './imageConvert'

export function registerIpcHandlers(): void {
  ipcMain.removeHandler('system:ping')
  ipcMain.removeHandler('window:minimize')
  ipcMain.removeHandler('window:toggleMaximize')
  ipcMain.removeHandler('window:close')
  ipcMain.removeHandler('window:isMaximized')
  ipcMain.removeHandler('files:openVideo')
  ipcMain.removeHandler('files:saveGif')
  ipcMain.removeHandler('files:openImage')
  ipcMain.removeHandler('files:saveImage')
  ipcMain.removeHandler('files:getFileInfo')
  ipcMain.removeHandler('videoToGif:convert')
  ipcMain.removeHandler('imageConvert:convert')

  registerSystemIpc()
  registerWindowIpc()
  registerFilesIpc()
  registerVideoToGifIpc()
  registerImageConvertIpc()
}
