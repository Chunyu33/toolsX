import { ipcMain } from 'electron'
import { registerSystemIpc } from './system'

export function registerIpcHandlers(): void {
  ipcMain.removeHandler('system:ping')

  registerSystemIpc()
}
