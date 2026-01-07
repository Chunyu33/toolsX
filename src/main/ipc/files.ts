import { dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { createWriteStream } from 'node:fs'
import { createRequire } from 'node:module'
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

export type OpenImagesResult = {
  canceled: boolean
  filePaths?: string[]
}

export type OpenPdfResult = {
  canceled: boolean
  filePath?: string
}

export type OpenPdfsResult = {
  canceled: boolean
  filePaths?: string[]
}

export type SavePdfArgs = {
  sourcePath: string
  defaultName?: string
}

export type SavePdfResult = {
  canceled: boolean
  savedPath?: string
}

export type WriteTempFileArgs = {
  // 说明：dirPrefix 用于区分工具/用途，必须走白名单校验，避免写入任意目录。
  // 举例：toolsx-pdf-20260101...
  dirPrefix: string
  name: string
  base64: string
}

export type WriteTempFileResult = {
  filePath: string
}

export type SaveImageArgs = {
  sourcePath: string
  defaultName?: string
}

export type SaveImageResult = {
  canceled: boolean
  savedPath?: string
}

export type SaveZipArgs = {
  entries: Array<{ sourcePath: string; name: string }>
  defaultName?: string
  readmeText?: string
}

export type SaveZipResult = {
  canceled: boolean
  savedPath?: string
}

export type CleanupTempImagesArgs = {
  tempDirs?: string[]
}

export type CleanupTempImagesResult = {
  deletedCount: number
}

export type GetFileInfoArgs = {
  filePath: string
}

export type GetFileInfoResult = {
  sizeBytes: number
}

function getArchiver() {
  const require = createRequire(import.meta.url)
  try {
    return require('archiver') as any
  } catch {
    throw new Error('缺少依赖 archiver：请在项目根目录执行 npm i archiver（安装后重启 npm run dev）。')
  }
}

function normalizePathForCompare(p: string): string {
  // Windows 下路径大小写不敏感，这里统一转小写并把分隔符归一化，避免误判
  return path.resolve(p).replace(/\\/g, '/').toLowerCase()
}

function isSafeToolsxTempDir(dir: string): boolean {
  // 说明：清理操作必须“非常保守”，只允许删除系统 temp 下 toolsx 生成的目录
  // 防止用户误传路径导致删除任意目录（安全边界）
  const tmp = normalizePathForCompare(os.tmpdir())
  const target = normalizePathForCompare(dir)
  if (!target.startsWith(tmp + '/')) return false

  const base = path.basename(dir)
  return base.startsWith('toolsx')
}

function isSafeToolsxTempPrefix(prefix: string): boolean {
  // 说明：写临时文件也必须非常保守，只允许 toolsx- 前缀。
  // 仍然会强制写入 os.tmpdir() 下，避免写入任意目录。
  return prefix.startsWith('toolsx-')
}

async function cleanupTempImageDirs(args: CleanupTempImagesArgs): Promise<CleanupTempImagesResult> {
  let deletedCount = 0

  if (args.tempDirs && args.tempDirs.length > 0) {
    // 说明：按 renderer 记录的输出目录清理（只清理通过白名单校验的目录）
    for (const dir of args.tempDirs) {
      if (!isSafeToolsxTempDir(dir)) continue
      try {
        await fs.rm(dir, { recursive: true, force: true })
        deletedCount += 1
      } catch {
        // ignore
      }
    }

    return { deletedCount }
  }

  // 说明：兜底策略：清理系统 temp 下所有 toolsx* 目录
  // 注意：只按前缀清理，不做更激进的匹配，避免误删
  try {
    const tmp = os.tmpdir()
    const list = await fs.readdir(tmp)
    for (const name of list) {
      if (!name.startsWith('toolsx')) continue
      const full = path.join(tmp, name)
      if (!isSafeToolsxTempDir(full)) continue
      try {
        await fs.rm(full, { recursive: true, force: true })
        deletedCount += 1
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return { deletedCount }
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

  ipcMain.handle(IpcChannels.FilesOpenImages, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      title: '选择图片文件（可多选）',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'ico', 'bmp', 'tiff'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      const payload: OpenImagesResult = { canceled: true }
      return payload
    }

    const payload: OpenImagesResult = { canceled: false, filePaths: result.filePaths }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesOpenPdf, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      title: '选择 PDF 文件',
      properties: ['openFile'],
      filters: [
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      const payload: OpenPdfResult = { canceled: true }
      return payload
    }

    const payload: OpenPdfResult = { canceled: false, filePath: result.filePaths[0] }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesOpenPdfs, async (_event: IpcMainInvokeEvent) => {
    const result = await dialog.showOpenDialog({
      title: '选择 PDF 文件（可多选）',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      const payload: OpenPdfsResult = { canceled: true }
      return payload
    }

    const payload: OpenPdfsResult = { canceled: false, filePaths: result.filePaths }
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

  ipcMain.handle(IpcChannels.FilesSavePdf, async (_event: IpcMainInvokeEvent, args: SavePdfArgs) => {
    const defaultName = args.defaultName ?? 'output.pdf'

    const result = await dialog.showSaveDialog({
      title: '保存 PDF',
      defaultPath: path.join(os.homedir(), defaultName),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) {
      const payload: SavePdfResult = { canceled: true }
      return payload
    }

    await fs.copyFile(args.sourcePath, result.filePath)
    const payload: SavePdfResult = { canceled: false, savedPath: result.filePath }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesWriteTempFile, async (_event: IpcMainInvokeEvent, args: WriteTempFileArgs) => {
    if (!isSafeToolsxTempPrefix(args.dirPrefix)) throw new Error('非法的临时目录前缀')
    if (!args.name || args.name.includes('..') || args.name.includes('/') || args.name.includes('\\')) throw new Error('非法的文件名')

    const dir = path.join(os.tmpdir(), args.dirPrefix)
    await fs.mkdir(dir, { recursive: true })

    const buf = Buffer.from(args.base64, 'base64')
    const filePath = path.join(dir, args.name)
    await fs.writeFile(filePath, buf)

    const payload: WriteTempFileResult = { filePath }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesSaveZip, async (_event: IpcMainInvokeEvent, args: SaveZipArgs) => {
    const defaultName = args.defaultName ?? 'output.zip'

    const result = await dialog.showSaveDialog({
      title: '保存压缩包（ZIP）',
      defaultPath: path.join(os.homedir(), defaultName),
      filters: [{ name: 'Zip', extensions: ['zip'] }]
    })

    if (result.canceled || !result.filePath) {
      const payload: SaveZipResult = { canceled: true }
      return payload
    }

    const archiver = getArchiver()
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(result.filePath as string)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => resolve())
      output.on('error', (e) => reject(e))

      archive.on('warning', () => {
        // ignore
      })
      archive.on('error', (e: unknown) => reject(e))

      archive.pipe(output)

      for (const entry of args.entries) {
        archive.file(entry.sourcePath, { name: entry.name })
      }

      if (args.readmeText) {
        archive.append(args.readmeText, { name: 'README.txt' })
      }

      void archive.finalize()
    })

    const payload: SaveZipResult = { canceled: false, savedPath: result.filePath }
    return payload
  })

  ipcMain.handle(IpcChannels.FilesCleanupTempImages, async (_event: IpcMainInvokeEvent, args: CleanupTempImagesArgs) => {
    const payload: CleanupTempImagesResult = await cleanupTempImageDirs(args)
    return payload
  })

  ipcMain.handle(IpcChannels.FilesGetFileInfo, async (_event: IpcMainInvokeEvent, args: GetFileInfoArgs) => {
    const st = await fs.stat(args.filePath)
    const payload: GetFileInfoResult = { sizeBytes: st.size }
    return payload
  })
}
