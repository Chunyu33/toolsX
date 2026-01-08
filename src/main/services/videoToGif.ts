import { app } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'node:module'

type ConvertArgs = {
  inputPath: string
  startSeconds: number
  endSeconds: number
  fps?: number
  width?: number
  keepOriginalWidth?: boolean
}

function getFfmpegPath(): string {
  // ffmpeg-static resolves to an absolute binary path at runtime.
  const require = createRequire(import.meta.url)
  try {
    const p = require('ffmpeg-static') as string
    if (!p) throw new Error('ffmpeg-static returned empty path')
    // 说明：打包后 ffmpeg.exe 往往位于 app.asar 内（虚拟路径），该路径无法被 child_process.spawn 直接执行，会导致 ENOENT。
    // TODO: 若后续替换为内置 ffmpeg 或其它实现，可移除此处对 asar.unpacked 的兼容。
    if (app.isPackaged && p.includes('app.asar')) {
      return p.replace('app.asar', 'app.asar.unpacked')
    }
    return p
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`ffmpeg-static resolve failed: ${msg}`)
  }
}

function clampSeconds(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, v)
}

function clampFps(v: number | undefined): number {
  if (!Number.isFinite(v)) return 12
  return Math.min(60, Math.max(1, Math.round(v as number)))
}

function clampWidth(v: number | undefined): number {
  if (!Number.isFinite(v)) return 720
  const n = Math.max(64, Math.round(v as number))
  // Some encoders/filters behave better with even widths.
  return n % 2 === 0 ? n : n - 1
}

export async function convertVideoSegmentToGif({ inputPath, startSeconds, endSeconds, fps, width, keepOriginalWidth }: ConvertArgs): Promise<string> {
  const start = clampSeconds(startSeconds)
  const end = clampSeconds(endSeconds)
  if (end <= start) throw new Error('Invalid time range: endSeconds must be greater than startSeconds')

  const outFps = clampFps(fps)
  const outWidth = keepOriginalWidth ? undefined : clampWidth(width)

  // Create an isolated temp folder for each conversion.
  const tmpDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'toolsx-v2g-'))
  const palettePath = path.join(tmpDir, 'palette.png')
  const outPath = path.join(tmpDir, 'out.gif')

  const ffmpeg = getFfmpegPath()
  try {
    await fs.access(ffmpeg)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      `ffmpeg-static binary not accessible: ${ffmpeg}. ` +
        `isPackaged=${String(app.isPackaged)} appPath=${app.getAppPath()} resourcesPath=${process.resourcesPath}. ` +
        `accessError=${msg}`
    )
  }
  const duration = end - start

  // Two-pass palette generation for better quality.
  // NOTE: Keep filters simple for first version; can extend with fps/scale options later.
  const paletteVf = outWidth
    ? `fps=${outFps},scale=${outWidth}:-1:flags=lanczos,palettegen`
    : `fps=${outFps},palettegen`

  const useLavfi = outWidth
    ? `fps=${outFps},scale=${outWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse`
    : `fps=${outFps}[x];[x][1:v]paletteuse`

  await runFfmpeg(ffmpeg, [
    '-ss',
    String(start),
    '-t',
    String(duration),
    '-i',
    inputPath,
    '-vf',
    paletteVf,
    '-y',
    palettePath
  ])

  await runFfmpeg(ffmpeg, [
    '-ss',
    String(start),
    '-t',
    String(duration),
    '-i',
    inputPath,
    '-i',
    palettePath,
    '-lavfi',
    useLavfi,
    '-y',
    outPath
  ])

  return outPath
}

async function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  return await new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { windowsHide: true })
    let stderr = ''

    p.stderr.on('data', (d) => {
      stderr += String(d)
    })

    p.on('error', (err) => reject(err))
    p.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`))
    })
  })
}
