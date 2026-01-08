export const IpcChannels = {
  SystemPing: 'system:ping',
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggleMaximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:isMaximized',
  FilesOpenVideo: 'files:openVideo',
  FilesSaveGif: 'files:saveGif',
  FilesOpenPdf: 'files:openPdf',
  FilesOpenPdfs: 'files:openPdfs',
  FilesSavePdf: 'files:savePdf',
  FilesOpenImage: 'files:openImage',
  FilesOpenImages: 'files:openImages',
  FilesSaveImage: 'files:saveImage',
  FilesSaveZip: 'files:saveZip',
  FilesWriteTempFile: 'files:writeTempFile',
  FilesCleanupTempImages: 'files:cleanupTempImages',
  FilesGetFileInfo: 'files:getFileInfo',
  VideoToGifConvert: 'videoToGif:convert',
  ImageConvertConvert: 'imageConvert:convert',
  ImageCropProcess: 'imageCrop:process',
  PdfMerge: 'pdf:merge',
  PdfSplit: 'pdf:split'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
