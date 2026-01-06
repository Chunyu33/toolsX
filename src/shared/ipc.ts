export const IpcChannels = {
  SystemPing: 'system:ping',
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggleMaximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:isMaximized',
  FilesOpenVideo: 'files:openVideo',
  FilesSaveGif: 'files:saveGif',
  FilesOpenImage: 'files:openImage',
  FilesSaveImage: 'files:saveImage',
  FilesGetFileInfo: 'files:getFileInfo',
  VideoToGifConvert: 'videoToGif:convert',
  ImageConvertConvert: 'imageConvert:convert'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
