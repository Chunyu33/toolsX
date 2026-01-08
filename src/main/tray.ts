import { app, BrowserWindow, Menu, Tray } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

function getTrayIconPath() {
  // 说明：Windows 托盘更建议使用 .ico
  // dev: 项目根目录下的 src/assets
  // packaged: electron-builder extraResources => resources/assets
  if (app.isPackaged) return join(process.resourcesPath, 'assets', 'app.ico')
  return join(process.cwd(), 'src', 'assets', 'app.ico')
}

function showMainWindow(win: BrowserWindow) {
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function registerTray(mainWindowGetter: () => BrowserWindow | null) {
  if (process.platform === 'darwin') return
  if (tray) return

  tray = new Tray(getTrayIconPath())
  tray.setToolTip('ToolsX')

  const buildMenu = () => {
    return Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          const win = mainWindowGetter()
          if (win) showMainWindow(win)
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit()
        }
      }
    ])
  }

  tray.setContextMenu(buildMenu())

  tray.on('click', () => {
    const win = mainWindowGetter()
    if (!win) return

    if (win.isVisible()) {
      win.hide()
    } else {
      showMainWindow(win)
    }
  })
}

export function destroyTray() {
  tray?.destroy()
  tray = null
}
