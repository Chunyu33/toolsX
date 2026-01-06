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
    saveGif: (args) => ipcRenderer.invoke(IpcChannels.FilesSaveGif, args)
  },
  videoToGif: {
    convert: (args) => ipcRenderer.invoke(IpcChannels.VideoToGifConvert, args)
  }
}

contextBridge.exposeInMainWorld('toolsx', api)
