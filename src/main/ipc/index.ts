import { ipcMain } from 'electron'
import { registerSystemIpc } from './system'
import { registerWindowIpc } from './window'
import { registerFilesIpc } from './files'
import { registerVideoToGifIpc } from './videoToGif'
import { registerImageConvertIpc } from './imageConvert'
// @ts-ignore
import { registerPdfIpc } from './pdf'

export function registerIpcHandlers(): void {
  ipcMain.removeHandler('system:ping')
  ipcMain.removeHandler('window:minimize')
  ipcMain.removeHandler('window:toggleMaximize')
  ipcMain.removeHandler('window:close')
  ipcMain.removeHandler('window:isMaximized')
  ipcMain.removeHandler('files:openVideo')
  ipcMain.removeHandler('files:saveGif')
  ipcMain.removeHandler('files:openPdf')
  ipcMain.removeHandler('files:openPdfs')
  ipcMain.removeHandler('files:savePdf')
  ipcMain.removeHandler('files:openImage')
  ipcMain.removeHandler('files:openImages')
  ipcMain.removeHandler('files:saveImage')
  ipcMain.removeHandler('files:saveZip')
  ipcMain.removeHandler('files:writeTempFile')
  ipcMain.removeHandler('files:getFileInfo')
  ipcMain.removeHandler('videoToGif:convert')
  ipcMain.removeHandler('imageConvert:convert')
  ipcMain.removeHandler('pdf:merge')
  ipcMain.removeHandler('pdf:split')

  registerSystemIpc()
  registerWindowIpc()
  registerFilesIpc()
  registerVideoToGifIpc()
  registerImageConvertIpc()
  registerPdfIpc()
}
