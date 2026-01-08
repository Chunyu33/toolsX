import { dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { IpcChannels } from '../../shared/ipc'
import { renderSvgToImage, type RenderSvgArgs, type RenderSvgResult } from '../services/svgTool'

export type OpenSvgResult = { canceled: boolean; filePath?: string; text?: string }
export type SaveSvgArgs = { text: string; defaultName?: string }
export type SaveSvgResult = { canceled: boolean; savedPath?: string }

export function registerSvgToolIpc(): void {
  ipcMain.handle(IpcChannels.SvgToolOpenSvg, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      title: '选择 SVG 文件',
      properties: ['openFile'],
      filters: [
        { name: 'SVG', extensions: ['svg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      const payload: OpenSvgResult = { canceled: true }
      return payload
    }

    const filePath = result.filePaths[0]
    const text = await fs.readFile(filePath, 'utf8')
    const payload: OpenSvgResult = { canceled: false, filePath, text }
    return payload
  })

  ipcMain.handle(IpcChannels.SvgToolSaveSvg, async (_event: IpcMainInvokeEvent, args: SaveSvgArgs) => {
    const defaultName = args.defaultName ?? 'image.svg'
    const result = await dialog.showSaveDialog({
      title: '保存 SVG',
      defaultPath: path.join(os.homedir(), defaultName),
      filters: [{ name: 'SVG', extensions: ['svg'] }]
    })

    if (result.canceled || !result.filePath) {
      const payload: SaveSvgResult = { canceled: true }
      return payload
    }

    await fs.writeFile(result.filePath, args.text ?? '', 'utf8')
    const payload: SaveSvgResult = { canceled: false, savedPath: result.filePath }
    return payload
  })

  ipcMain.handle(IpcChannels.SvgToolRender, async (_event: IpcMainInvokeEvent, args: RenderSvgArgs) => {
    const result = await renderSvgToImage(args)
    const payload: RenderSvgResult = result
    return payload
  })
}
