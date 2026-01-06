import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import { convertVideoSegmentToGif } from '../services/videoToGif'

export type ConvertVideoToGifArgs = {
  inputPath: string
  startSeconds: number
  endSeconds: number
}

export type ConvertVideoToGifResult = {
  gifPath: string
}

export function registerVideoToGifIpc(): void {
  ipcMain.handle(IpcChannels.VideoToGifConvert, async (_event: IpcMainInvokeEvent, args: ConvertVideoToGifArgs) => {
    const gifPath = await convertVideoSegmentToGif({
      inputPath: args.inputPath,
      startSeconds: args.startSeconds,
      endSeconds: args.endSeconds
    })

    const payload: ConvertVideoToGifResult = { gifPath }
    return payload
  })
}
