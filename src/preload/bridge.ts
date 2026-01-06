import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc'

export type ToolsXApi = {
  system: {
    ping: () => Promise<string>
  }
}

export const api: ToolsXApi = {
  system: {
    ping: () => ipcRenderer.invoke(IpcChannels.SystemPing)
  }
}

contextBridge.exposeInMainWorld('toolsx', api)
