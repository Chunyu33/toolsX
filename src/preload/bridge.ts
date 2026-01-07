import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc'

export type ToolsXApi = {
  system: {
    ping: () => Promise<string>
  }
  windowControls: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
  }
  files: {
    openVideo: () => Promise<{ canceled: boolean; filePath?: string }>
    saveGif: (args: { sourcePath: string }) => Promise<{ canceled: boolean; savedPath?: string }>
    openImage: () => Promise<{ canceled: boolean; filePath?: string }>
    openImages: () => Promise<{ canceled: boolean; filePaths?: string[] }>
    saveImage: (args: { sourcePath: string; defaultName?: string }) => Promise<{ canceled: boolean; savedPath?: string }>
    saveZip: (args: {
      entries: Array<{ sourcePath: string; name: string }>
      defaultName?: string
      readmeText?: string
    }) => Promise<{ canceled: boolean; savedPath?: string }>
    cleanupTempImages: (args: { tempDirs?: string[] }) => Promise<{ deletedCount: number }>
    getFileInfo: (args: { filePath: string }) => Promise<{ sizeBytes: number }>
  }
  videoToGif: {
    convert: (args: {
      inputPath: string
      startSeconds: number
      endSeconds: number
      fps?: number
      width?: number
      keepOriginalWidth?: boolean
    }) => Promise<{ gifPath: string }>
  }
  imageConvert: {
    convert: (
      args:
        | {
            mode?: 'convert'
            inputPath: string
            format: 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'ico'
            quality?: number
          }
        | {
            mode: 'targetSize'
            inputPath: string
            targetKb: number
            prefer?: 'auto-small' | 'keep-format'
            format?: 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'ico'
          }
    ) => Promise<{ outputPath: string; format: 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'ico'; quality?: number; sizeBytes: number }>
  }
}

export const api: ToolsXApi = {
  system: {
    ping: () => ipcRenderer.invoke(IpcChannels.SystemPing)
  },
  windowControls: {
    minimize: () => ipcRenderer.invoke(IpcChannels.WindowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(IpcChannels.WindowToggleMaximize),
    close: () => ipcRenderer.invoke(IpcChannels.WindowClose),
    isMaximized: () => ipcRenderer.invoke(IpcChannels.WindowIsMaximized)
  },
  files: {
    openVideo: () => ipcRenderer.invoke(IpcChannels.FilesOpenVideo),
    saveGif: (args) => ipcRenderer.invoke(IpcChannels.FilesSaveGif, args),
    openImage: () => ipcRenderer.invoke(IpcChannels.FilesOpenImage),
    openImages: () => ipcRenderer.invoke(IpcChannels.FilesOpenImages),
    saveImage: (args) => ipcRenderer.invoke(IpcChannels.FilesSaveImage, args),
    saveZip: (args) => ipcRenderer.invoke(IpcChannels.FilesSaveZip, args),
    cleanupTempImages: (args) => ipcRenderer.invoke(IpcChannels.FilesCleanupTempImages, args),
    getFileInfo: (args) => ipcRenderer.invoke(IpcChannels.FilesGetFileInfo, args)
  },
  videoToGif: {
    convert: (args) => ipcRenderer.invoke(IpcChannels.VideoToGifConvert, args)
  },
  imageConvert: {
    convert: (args) => ipcRenderer.invoke(IpcChannels.ImageConvertConvert, args)
  }
}

contextBridge.exposeInMainWorld('toolsx', api)
