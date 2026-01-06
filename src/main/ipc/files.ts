import { dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'

export type OpenVideoResult = {
  canceled: boolean
  filePath?: string
}

export function registerFilesIpc(): void {
  ipcMain.handle(IpcChannels.FilesOpenVideo, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      title: '选择视频文件',
      properties: ['openFile'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      const payload: OpenVideoResult = { canceled: true }
      return payload
    }

    const payload: OpenVideoResult = { canceled: false, filePath: result.filePaths[0] }
    return payload
  })
}
