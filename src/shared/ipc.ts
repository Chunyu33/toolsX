export const IpcChannels = {
  SystemPing: 'system:ping',
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggleMaximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:isMaximized',
  FilesOpenVideo: 'files:openVideo',
  VideoToGifConvert: 'videoToGif:convert'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
