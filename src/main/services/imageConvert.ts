import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'node:module'

export type ImageOutputFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'ico'

export type ConvertImageMode = 'convert' | 'targetSize'

export type ConvertImageArgs =
  | {
      mode?: 'convert'
      inputPath: string
      format: ImageOutputFormat
      quality?: number
    }
  | {
      mode: 'targetSize'
      inputPath: string
      targetKb: number
      prefer?: 'auto-small' | 'keep-format'
      format?: ImageOutputFormat
    }

export type ConvertImageOutput = {
  outputPath: string
  format: ImageOutputFormat
  quality?: number
  sizeBytes: number
}

function isIcoInput(inputPath: string): boolean {
  // 说明：目前项目依赖 sharp 作为统一解码/编码入口，但 sharp 对 ICO 的“解码”兼容性不稳定
  // （很多 .ico 会报 Input file contains unsupported image format）。
  // 因此我们先明确限制：支持“输出 ICO”，但不保证“ICO 输入互转”。
  return inputPath.toLowerCase().endsWith('.ico')
}

function clampQuality(v: number | undefined): number {
  if (!Number.isFinite(v)) return 80
  return Math.min(100, Math.max(1, Math.round(v as number)))
}

function clampTargetKb(v: number): number {
  if (!Number.isFinite(v)) return 300
  return Math.max(10, Math.round(v))
}

function getSharp() {
  const require = createRequire(import.meta.url)
  try {
    return require('sharp') as any
  } catch {
    throw new Error('缺少依赖 sharp：请在项目根目录执行 npm i sharp（安装后重启 npm run dev）。')
  }
}

async function getPngToIco(): Promise<(buffers: Buffer[]) => Promise<Buffer>> {
  const require = createRequire(import.meta.url)
  try {
    const mod = require('png-to-ico') as any
    return (mod?.default ?? mod) as (buffers: Buffer[]) => Promise<Buffer>
  } catch (e) {
    try {
      const mod = (await import('png-to-ico')) as any
      return (mod?.default ?? mod) as (buffers: Buffer[]) => Promise<Buffer>
    } catch (e2) {
      const message = e2 instanceof Error ? e2.message : String(e2)
      throw new Error(
        `无法加载依赖 png-to-ico（可能为 ESM/CJS 兼容问题）：${message}\n\n` +
          `建议：1）确认已安装 npm i png-to-ico；2）重启 npm run dev；3）如仍失败，把报错全文发我。`
      )
    }
  }
}

async function renderToBuffer(args: { inputPath: string; format: ImageOutputFormat; quality?: number }): Promise<Buffer> {
  const sharp = getSharp()
  const q = clampQuality(args.quality)

  if (isIcoInput(args.inputPath) && args.format !== 'ico') {
    // 说明：这类错误如果直接抛 sharp 的原始报错，用户只会看到“unsupported image format”，体验很差。
    // 这里做前置拦截，给出可理解的提示。
    throw new Error('暂不支持将 ICO 作为输入转换为其它格式（当前仅支持输出 ICO）。请换用 PNG/JPG/WebP 等作为输入，或先用其它工具把 ICO 导出为 PNG 后再转换。')
  }

  if (args.format === 'ico') {
    const pngToIco = await getPngToIco()
    const sizes = [16, 32, 48, 64, 128, 256]
    const buffers: Buffer[] = []

    for (const s of sizes) {
      const b = await sharp(args.inputPath)
        .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
      buffers.push(b)
    }

    const icoBuffer: Buffer = await pngToIco(buffers)
    return icoBuffer
  }

  let pipeline = sharp(args.inputPath)

  if (args.format === 'png') {
    pipeline = pipeline.png()
  } else if (args.format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality: q })
  } else if (args.format === 'webp') {
    pipeline = pipeline.webp({ quality: q })
  } else if (args.format === 'gif') {
    pipeline = pipeline.gif()
  } else {
    pipeline = pipeline.avif({ quality: q })
  }

  return await pipeline.toBuffer()
}

async function writeOutput(tmpDir: string, format: ImageOutputFormat, buffer: Buffer): Promise<string> {
  const ext = format === 'jpeg' ? 'jpg' : format
  const outPath = path.join(tmpDir, `out.${ext}`)
  await fs.writeFile(outPath, buffer)
  return outPath
}

async function optimizeToTargetSize(args: {
  inputPath: string
  targetKb: number
  prefer: 'auto-small' | 'keep-format'
  format?: ImageOutputFormat
}): Promise<ConvertImageOutput> {
  const targetBytes = clampTargetKb(args.targetKb) * 1024

  const candidates: ImageOutputFormat[] =
    args.prefer === 'keep-format' && args.format
      ? [args.format]
      : ['avif', 'webp', 'jpeg']

  let bestUnder: { format: ImageOutputFormat; quality: number; buffer: Buffer } | null = null
  let bestOver: { format: ImageOutputFormat; quality: number; buffer: Buffer } | null = null

  for (const format of candidates) {
    let lo = 20
    let hi = 95
    let bestLocalUnder: { quality: number; buffer: Buffer } | null = null
    let bestLocalOver: { quality: number; buffer: Buffer } | null = null

    for (let i = 0; i < 10 && lo <= hi; i++) {
      const mid = Math.floor((lo + hi) / 2)
      const buffer = await renderToBuffer({ inputPath: args.inputPath, format, quality: mid })

      if (buffer.byteLength <= targetBytes) {
        bestLocalUnder = { quality: mid, buffer }
        lo = mid + 1
      } else {
        bestLocalOver = { quality: mid, buffer }
        hi = mid - 1
      }
    }

    if (bestLocalUnder) {
      const cand = { format, quality: bestLocalUnder.quality, buffer: bestLocalUnder.buffer }
      if (!bestUnder || cand.buffer.byteLength < bestUnder.buffer.byteLength) {
        bestUnder = cand
      }
    } else if (bestLocalOver) {
      const cand = { format, quality: bestLocalOver.quality, buffer: bestLocalOver.buffer }
      if (!bestOver || cand.buffer.byteLength < bestOver.buffer.byteLength) {
        bestOver = cand
      }
    }
  }

  const chosen = bestUnder ?? bestOver
  if (!chosen) throw new Error('图片压缩失败：无法生成输出')

  const tmpDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'toolsx-imgc-'))
  const outPath = await writeOutput(tmpDir, chosen.format, chosen.buffer)
  return { outputPath: outPath, format: chosen.format, quality: chosen.quality, sizeBytes: chosen.buffer.byteLength }
}

export async function convertImage(args: ConvertImageArgs): Promise<ConvertImageOutput> {
  if (args.mode === 'targetSize') {
    return await optimizeToTargetSize({
      inputPath: args.inputPath,
      targetKb: args.targetKb,
      prefer: args.prefer ?? 'auto-small',
      format: args.format
    })
  }

  const q = clampQuality('quality' in args ? args.quality : undefined)
  const buffer = await renderToBuffer({ inputPath: args.inputPath, format: args.format, quality: q })
  const tmpDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'toolsx-imgc-'))
  const outPath = await writeOutput(tmpDir, args.format, buffer)
  return { outputPath: outPath, format: args.format, quality: args.format === 'png' || args.format === 'gif' || args.format === 'ico' ? undefined : q, sizeBytes: buffer.byteLength }
}
