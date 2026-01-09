import Store from 'electron-store'
import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'

type UiPrefsSchema = {
  backButtonXPct: number
  backButtonYPct: number
}

const store = new Store<UiPrefsSchema>({
  name: 'ui-prefs',
  defaults: {
    backButtonXPct: 0.03,
    backButtonYPct: 0.2
  }
})

function clampPct(v: unknown, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback
  return Math.max(0, Math.min(1, n))
}

export function registerUiPrefsIpc(): void {
  ipcMain.handle(IpcChannels.UiPrefsGetBackButtonPos, (_event: IpcMainInvokeEvent) => {
    return { xPct: store.get('backButtonXPct'), yPct: store.get('backButtonYPct') }
  })

  ipcMain.handle(
    IpcChannels.UiPrefsSetBackButtonPos,
    (_event: IpcMainInvokeEvent, args: { xPct: number; yPct: number }) => {
      const xPct = clampPct(args?.xPct, 0.03)
      const yPct = clampPct(args?.yPct, 0.2)
      store.set('backButtonXPct', xPct)
      store.set('backButtonYPct', yPct)
      return { xPct, yPct }
    }
  )
}
