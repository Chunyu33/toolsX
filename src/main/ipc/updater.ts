import { ipcMain } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import { updaterService } from '../services/updater'

export function registerUpdaterIpc(): void {
  updaterService.initOnce()

  ipcMain.handle(IpcChannels.UpdaterGetVersion, async () => {
    return { version: updaterService.getVersion() }
  })

  ipcMain.handle(IpcChannels.UpdaterGetStatus, async () => {
    return updaterService.getLastStatus()
  })

  ipcMain.handle(IpcChannels.UpdaterCheckForUpdates, async () => {
    return await updaterService.checkForUpdates()
  })

  ipcMain.handle(IpcChannels.UpdaterDownloadUpdate, async () => {
    return await updaterService.downloadUpdate()
  })

  ipcMain.handle(IpcChannels.UpdaterQuitAndInstall, async () => {
    updaterService.quitAndInstall()
  })
}
