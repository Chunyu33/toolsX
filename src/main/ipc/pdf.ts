import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannels } from '../../shared/ipc'
import { mergePdf, splitPdf, type PdfMergeArgs, type PdfMergeResult, type PdfSplitArgs, type PdfSplitResult } from '../services/pdf'

export function registerPdfIpc(): void {
  ipcMain.handle(IpcChannels.PdfMerge, async (_event: IpcMainInvokeEvent, args: PdfMergeArgs) => {
    const result = await mergePdf(args)
    const payload: PdfMergeResult = result
    return payload
  })

  ipcMain.handle(IpcChannels.PdfSplit, async (_event: IpcMainInvokeEvent, args: PdfSplitArgs) => {
    const result = await splitPdf(args)
    const payload: PdfSplitResult = result
    return payload
  })
}
