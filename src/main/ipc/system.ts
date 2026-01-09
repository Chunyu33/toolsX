import { app, clipboard, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'

export function registerSystemIpc(): void {
  ipcMain.handle(IpcChannels.SystemPing, async () => {
    return `pong (v${app.getVersion()})`
  })

  ipcMain.handle(IpcChannels.SystemCopyText, async (_event: IpcMainInvokeEvent, args: { text: string }) => {
    clipboard.writeText(String(args?.text ?? ''))
  })
}
