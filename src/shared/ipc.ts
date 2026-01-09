export const IpcChannels = {
  SystemPing: 'system:ping',
  SystemCopyText: 'system:copyText',
  WindowMinimize: 'window:minimize',
  WindowToggleMaximize: 'window:toggleMaximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:isMaximized',

  UiPrefsGetBackButtonPos: 'uiPrefs:getBackButtonPos',
  UiPrefsSetBackButtonPos: 'uiPrefs:setBackButtonPos',

  UpdaterGetVersion: 'updater:getVersion',
  UpdaterGetStatus: 'updater:getStatus',
  UpdaterCheckForUpdates: 'updater:checkForUpdates',
  UpdaterDownloadUpdate: 'updater:downloadUpdate',
  UpdaterQuitAndInstall: 'updater:quitAndInstall',
  UpdaterStatusChanged: 'updater:statusChanged',

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
  SvgToolOpenSvg: 'svgTool:openSvg',
  SvgToolSaveSvg: 'svgTool:saveSvg',
  SvgToolRender: 'svgTool:render',
  PdfMerge: 'pdf:merge',
  PdfSplit: 'pdf:split'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
