import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import { convertVideoSegmentToGif } from '../services/videoToGif'

export type ConvertVideoToGifArgs = {
  inputPath: string
  startSeconds: number
  endSeconds: number
  fps?: number
  width?: number
  keepOriginalWidth?: boolean
}

export type ConvertVideoToGifResult = {
  gifPath: string
}

export function registerVideoToGifIpc(): void {
  ipcMain.handle(IpcChannels.VideoToGifConvert, async (_event: IpcMainInvokeEvent, args: ConvertVideoToGifArgs) => {
    const gifPath = await convertVideoSegmentToGif({
      inputPath: args.inputPath,
      startSeconds: args.startSeconds,
      endSeconds: args.endSeconds,
      fps: args.fps,
      width: args.width,
      keepOriginalWidth: args.keepOriginalWidth
    })

    const payload: ConvertVideoToGifResult = { gifPath }
    return payload
  })
}
