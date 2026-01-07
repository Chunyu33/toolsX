export const IpcChannels = {
  SystemPing: 'system:ping',
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggleMaximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:isMaximized',
  FilesOpenVideo: 'files:openVideo',
  FilesSaveGif: 'files:saveGif',
  FilesOpenImage: 'files:openImage',
  FilesOpenImages: 'files:openImages',
  FilesSaveImage: 'files:saveImage',
  FilesSaveZip: 'files:saveZip',
  FilesCleanupTempImages: 'files:cleanupTempImages',
  FilesGetFileInfo: 'files:getFileInfo',
  VideoToGifConvert: 'videoToGif:convert',
  ImageConvertConvert: 'imageConvert:convert'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
