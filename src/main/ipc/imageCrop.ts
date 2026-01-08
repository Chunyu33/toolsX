import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import { cropImage, type ImageCropArgs, type ImageCropResult } from '../services/imageCrop'

export function registerImageCropIpc(): void {
  ipcMain.handle(IpcChannels.ImageCropProcess, async (_event: IpcMainInvokeEvent, args: ImageCropArgs) => {
    const result = await cropImage(args)
    const payload: ImageCropResult = result
    return payload
  })
}
