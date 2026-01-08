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
    openPdf: () => Promise<{ canceled: boolean; filePath?: string }>
    openPdfs: () => Promise<{ canceled: boolean; filePaths?: string[] }>
    savePdf: (args: { sourcePath: string; defaultName?: string }) => Promise<{ canceled: boolean; savedPath?: string }>
    openImage: () => Promise<{ canceled: boolean; filePath?: string }>
    openImages: () => Promise<{ canceled: boolean; filePaths?: string[] }>
    saveImage: (args: { sourcePath: string; defaultName?: string }) => Promise<{ canceled: boolean; savedPath?: string }>
    writeTempFile: (args: { dirPrefix: string; name: string; base64: string }) => Promise<{ filePath: string }>
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

  imageCrop: {
    process: (args: {
      inputPath: string
      rect: { x: number; y: number; width: number; height: number }
      round: { radius: number; corners: { tl: boolean; tr: boolean; br: boolean; bl: boolean } }
    }) => Promise<{ outputPath: string; tempDir: string; width: number; height: number }>
  }

  pdf: {
    merge: (args: { inputPaths: string[] }) => Promise<{ outputPath: string; tempDir: string }>
    split: (args: {
      inputPath: string
      mode: 'range' | 'splitAll'
      ranges?: Array<{ start: number; end: number }>
    }) => Promise<{ outputPaths: string[]; tempDir: string }>
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
    openPdf: () => ipcRenderer.invoke(IpcChannels.FilesOpenPdf),
    openPdfs: () => ipcRenderer.invoke(IpcChannels.FilesOpenPdfs),
    savePdf: (args) => ipcRenderer.invoke(IpcChannels.FilesSavePdf, args),
    openImage: () => ipcRenderer.invoke(IpcChannels.FilesOpenImage),
    openImages: () => ipcRenderer.invoke(IpcChannels.FilesOpenImages),
    saveImage: (args) => ipcRenderer.invoke(IpcChannels.FilesSaveImage, args),
    writeTempFile: (args) => ipcRenderer.invoke(IpcChannels.FilesWriteTempFile, args),
    saveZip: (args) => ipcRenderer.invoke(IpcChannels.FilesSaveZip, args),
    cleanupTempImages: (args) => ipcRenderer.invoke(IpcChannels.FilesCleanupTempImages, args),
    getFileInfo: (args) => ipcRenderer.invoke(IpcChannels.FilesGetFileInfo, args)
  },
  videoToGif: {
    convert: (args) => ipcRenderer.invoke(IpcChannels.VideoToGifConvert, args)
  },
  imageConvert: {
    convert: (args) => ipcRenderer.invoke(IpcChannels.ImageConvertConvert, args)
  },
  imageCrop: {
    process: (args) => ipcRenderer.invoke(IpcChannels.ImageCropProcess, args)
  },
  pdf: {
    merge: (args) => ipcRenderer.invoke(IpcChannels.PdfMerge, args),
    split: (args) => ipcRenderer.invoke(IpcChannels.PdfSplit, args)
  }
}

contextBridge.exposeInMainWorld('toolsx', api)
