import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import { convertImage, type ConvertImageArgs, type ConvertImageOutput } from '../services/imageConvert'

export function registerImageConvertIpc(): void {
  ipcMain.handle(IpcChannels.ImageConvertConvert, async (_event: IpcMainInvokeEvent, args: ConvertImageArgs) => {
    const result = await convertImage(args)
    const payload: ConvertImageOutput = result
    return payload
  })
}
