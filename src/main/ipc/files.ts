import { dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { IpcChannels } from '../../shared/ipc'

export type OpenVideoResult = {
  canceled: boolean
  filePath?: string
}

export type SaveGifArgs = {
  sourcePath: string
}

export type SaveGifResult = {
  canceled: boolean
  savedPath?: string
}

export type OpenImageResult = {
  canceled: boolean
  filePath?: string
}

export type SaveImageArgs = {
  sourcePath: string
  defaultName?: string
}

export type SaveImageResult = {
  canceled: boolean
  savedPath?: string
}

export type GetFileInfoArgs = {
  filePath: string
}

export type GetFileInfoResult = {
  sizeBytes: number
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

  ipcMain.handle(IpcChannels.FilesSaveGif, async (_event: IpcMainInvokeEvent, args: SaveGifArgs) => {
    const result = await dialog.showSaveDialog({
      title: '保存 GIF',
      defaultPath: path.join(os.homedir(), 'output.gif'),
      filters: [{ name: 'GIF Image', extensions: ['gif'] }]
    })

    if (result.canceled || !result.filePath) {
      const payload: SaveGifResult = { canceled: true }
      return payload
    }

    await fs.copyFile(args.sourcePath, result.filePath)
    const payload: SaveGifResult = { canceled: false, savedPath: result.filePath }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesOpenImage, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      title: '选择图片文件',
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'ico', 'bmp', 'tiff'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      const payload: OpenImageResult = { canceled: true }
      return payload
    }

    const payload: OpenImageResult = { canceled: false, filePath: result.filePaths[0] }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesSaveImage, async (_event: IpcMainInvokeEvent, args: SaveImageArgs) => {
    const defaultName = args.defaultName ?? 'output.png'

    const result = await dialog.showSaveDialog({
      title: '保存图片',
      defaultPath: path.join(os.homedir(), defaultName),
      filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'ico'] }]
    })

    if (result.canceled || !result.filePath) {
      const payload: SaveImageResult = { canceled: true }
      return payload
    }

    await fs.copyFile(args.sourcePath, result.filePath)
    const payload: SaveImageResult = { canceled: false, savedPath: result.filePath }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesGetFileInfo, async (_event: IpcMainInvokeEvent, args: GetFileInfoArgs) => {
    const st = await fs.stat(args.filePath)
    const payload: GetFileInfoResult = { sizeBytes: st.size }
    return payload
  })
}
