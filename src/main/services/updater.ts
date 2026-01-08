import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { ProgressInfo, UpdateInfo } from 'electron-updater'
import { IpcChannels } from '../../shared/ipc'

export type UpdaterStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number; transferred: number; total: number; bytesPerSecond: number }
  | { status: 'downloaded'; version: string; releaseNotes?: string }
  | { status: 'error'; message: string }

class UpdaterService {
  private inited = false
  private lastStatus: UpdaterStatus = { status: 'idle' }

  private get forceDevUpdate(): boolean {
    return process.env.TOOLSX_FORCE_DEV_UPDATE === '1'
  }

  initOnce() {
    if (this.inited) return
    this.inited = true

    autoUpdater.autoDownload = false
    autoUpdater.forceDevUpdateConfig = this.forceDevUpdate

    autoUpdater.on('checking-for-update', () => {
      this.emit({ status: 'checking' })
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.emit({ status: 'available', version: info.version, releaseNotes: this.normalizeReleaseNotes(info.releaseNotes) })
    })

    autoUpdater.on('update-not-available', () => {
      this.emit({ status: 'not-available' })
    })

    autoUpdater.on('download-progress', (p: ProgressInfo) => {
      this.emit({
        status: 'downloading',
        percent: p.percent,
        transferred: p.transferred,
        total: p.total,
        bytesPerSecond: p.bytesPerSecond
      })
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.emit({ status: 'downloaded', version: info.version, releaseNotes: this.normalizeReleaseNotes(info.releaseNotes) })
    })

    autoUpdater.on('error', (e: unknown) => {
      const message = e instanceof Error ? e.message : String(e)
      this.emit({ status: 'error', message })
    })
  }

  getVersion() {
    return app.getVersion()
  }

  getLastStatus() {
    return this.lastStatus
  }

  async checkForUpdates() {
    this.initOnce()
    if (!app.isPackaged && !this.forceDevUpdate) {
      this.emit({ status: 'error', message: '开发环境默认不执行自动更新检查，请使用打包后的安装包验证更新；或设置 TOOLSX_FORCE_DEV_UPDATE=1 进行本地模拟。' })
      return this.lastStatus
    }
    try {
      await autoUpdater.checkForUpdates()
      return this.lastStatus
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.emit({ status: 'error', message })
      return this.lastStatus
    }
  }

  async downloadUpdate() {
    this.initOnce()
    if (!app.isPackaged && !this.forceDevUpdate) {
      this.emit({ status: 'error', message: '开发环境默认不执行自动更新下载，请使用打包后的安装包验证更新；或设置 TOOLSX_FORCE_DEV_UPDATE=1 进行本地模拟。' })
      return this.lastStatus
    }
    try {
      await autoUpdater.downloadUpdate()
      return this.lastStatus
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      this.emit({ status: 'error', message })
      return this.lastStatus
    }
  }

  quitAndInstall() {
    this.initOnce()
    autoUpdater.quitAndInstall()
  }

  private emit(s: UpdaterStatus) {
    this.lastStatus = s
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IpcChannels.UpdaterStatusChanged, s)
    }
  }

  private normalizeReleaseNotes(v: unknown): string | undefined {
    if (!v) return undefined
    if (typeof v === 'string') return v
    if (Array.isArray(v)) {
      const first = v[0] as any
      if (first && typeof first.note === 'string') return first.note
    }
    return undefined
  }
}

export const updaterService = new UpdaterService()
