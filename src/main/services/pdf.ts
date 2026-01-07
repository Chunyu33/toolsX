import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { PDFDocument } from 'pdf-lib'

export type PdfMergeArgs = {
  inputPaths: string[]
}

export type PdfMergeResult = {
  outputPath: string
  tempDir: string
}

export type PdfSplitArgs =
  | {
      inputPath: string
      mode: 'splitAll'
    }
  | {
      inputPath: string
      mode: 'range'
      // 说明：页码使用 1-based，符合用户心智；并且支持多个范围输出多个 PDF。
      ranges: Array<{ start: number; end: number }>
    }

export type PdfSplitResult = {
  outputPaths: string[]
  tempDir: string
}

function createTempDir(): { tempDir: string; dirPrefix: string } {
  const dirPrefix = `toolsx-pdf-${Date.now()}`
  const tempDir = path.join(os.tmpdir(), dirPrefix)
  return { tempDir, dirPrefix }
}

async function readFileBytes(p: string): Promise<Uint8Array> {
  const buf = await fs.readFile(p)
  return new Uint8Array(buf)
}

export async function mergePdf(args: PdfMergeArgs): Promise<PdfMergeResult> {
  if (!args.inputPaths || args.inputPaths.length < 2) throw new Error('请至少选择 2 个 PDF 文件进行合并')

  const { tempDir } = createTempDir()
  await fs.mkdir(tempDir, { recursive: true })

  const merged = await PDFDocument.create()

  for (const p of args.inputPaths) {
    const srcBytes = await readFileBytes(p)
    const srcDoc = await PDFDocument.load(srcBytes)
    const pages = await merged.copyPages(srcDoc, srcDoc.getPageIndices())
    for (const pg of pages) merged.addPage(pg)
  }

  const outBytes = await merged.save()
  const outputPath = path.join(tempDir, 'merged.pdf')
  await fs.writeFile(outputPath, Buffer.from(outBytes))

  return { outputPath, tempDir }
}

function normalizeRanges(ranges: Array<{ start: number; end: number }>, pageCount: number): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = []

  for (const r of ranges) {
    const s = Math.max(1, Math.min(pageCount, Math.floor(r.start)))
    const e = Math.max(1, Math.min(pageCount, Math.floor(r.end)))
    if (!Number.isFinite(s) || !Number.isFinite(e)) continue
    const start = Math.min(s, e)
    const end = Math.max(s, e)
    out.push({ start, end })
  }

  if (out.length === 0) throw new Error('无有效页码范围')
  return out
}

export async function splitPdf(args: PdfSplitArgs): Promise<PdfSplitResult> {
  const { tempDir } = createTempDir()
  await fs.mkdir(tempDir, { recursive: true })

  const srcBytes = await readFileBytes(args.inputPath)
  const srcDoc = await PDFDocument.load(srcBytes)
  const pageCount = srcDoc.getPageCount()

  if (pageCount <= 0) throw new Error('PDF 没有可拆分的页面')

  const outputPaths: string[] = []

  if (args.mode === 'splitAll') {
    for (let i = 0; i < pageCount; i++) {
      const outDoc = await PDFDocument.create()
      const [page] = await outDoc.copyPages(srcDoc, [i])
      outDoc.addPage(page)

      const bytes = await outDoc.save()
      const name = `page_${String(i + 1).padStart(3, '0')}.pdf`
      const outPath = path.join(tempDir, name)
      await fs.writeFile(outPath, Buffer.from(bytes))
      outputPaths.push(outPath)
    }

    return { outputPaths, tempDir }
  }

  const ranges = normalizeRanges(args.ranges, pageCount)

  for (let idx = 0; idx < ranges.length; idx++) {
    const r = ranges[idx]
    const outDoc = await PDFDocument.create()

    const indices: number[] = []
    for (let p = r.start; p <= r.end; p++) indices.push(p - 1)

    const pages = await outDoc.copyPages(srcDoc, indices)
    for (const pg of pages) outDoc.addPage(pg)

    const bytes = await outDoc.save()
    const name = `range_${String(idx + 1).padStart(2, '0')}_${r.start}-${r.end}.pdf`
    const outPath = path.join(tempDir, name)
    await fs.writeFile(outPath, Buffer.from(bytes))
    outputPaths.push(outPath)
  }

  return { outputPaths, tempDir }
}
