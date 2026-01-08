import { app, BrowserWindow, shell } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function getAppIconPath() {
  // dev: 项目根目录下的 src/assets
  // packaged: electron-builder extraResources => resources/assets
  if (app.isPackaged) return join(process.resourcesPath, 'assets', 'app.ico')
  return join(process.cwd(), 'src', 'assets', 'app.ico')
}

export async function createMainWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    icon: getAppIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()

    // TODO: 打包产物黑屏排查用。需要时设置环境变量 TOOLSX_OPEN_DEVTOOLS=1 让安装包也自动打开 DevTools。
    // const shouldOpenDevTools = Boolean(process.env.ELECTRON_RENDERER_URL) || process.env.TOOLSX_OPEN_DEVTOOLS === '1'
    // if (shouldOpenDevTools) win.webContents.openDevTools({ mode: 'detach' })
    win.webContents.openDevTools({ mode: 'detach' })
  })

  win.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
