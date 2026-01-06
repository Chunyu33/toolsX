import { app, ipcMain } from 'electron'
import { IpcChannels } from '../../shared/ipc'

export function registerSystemIpc(): void {
  ipcMain.handle(IpcChannels.SystemPing, async () => {
    return `pong (v${app.getVersion()})`
  })
}
