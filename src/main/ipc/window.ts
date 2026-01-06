import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'

function getSenderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) throw new Error('No BrowserWindow for IPC sender')
  return win
}

export function registerWindowIpc(): void {
  ipcMain.handle(IpcChannels.WindowMinimize, async (event) => {
    getSenderWindow(event).minimize()
  })

  ipcMain.handle(IpcChannels.WindowToggleMaximize, async (event) => {
    const win = getSenderWindow(event)
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.handle(IpcChannels.WindowClose, async (event) => {
    getSenderWindow(event).close()
  })

  ipcMain.handle(IpcChannels.WindowIsMaximized, async (event) => {
    return getSenderWindow(event).isMaximized()
  })
}
