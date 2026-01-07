import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { tools } from '../features/tools/data'
import VideoToGifPage from '../features/videoToGif/VideoToGifPage'
import ImageConvertPage from '../features/imageConvert/ImageConvertPage'
import ImageCompressPage from '../features/imageCompress/ImageCompressPage'
import TimestampConvertPage from '../features/timestampConvert/TimestampConvertPage'
import Base64ToolPage from '../features/base64Tool/Base64ToolPage'
import QrToolPage from '../features/qrTool/QrToolPage'
import PdfToolPage from '../features/pdfTool/PdfToolPage'
import JsonFormatterPage from '../features/jsonFormatter/JsonFormatterPage'

export default function ToolPage() {
  const { toolId } = useParams()

  const tool = useMemo(() => tools.find((t) => t.id === toolId), [toolId])

  return (
    <div className="app-gradient-bg flex h-full min-h-0 flex-col">
      <Header title={tool?.title ?? '工具'} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {toolId === 'video-to-gif' ? (
          <VideoToGifPage />
        ) : toolId === 'image-convert' ? (
          <ImageConvertPage />
        ) : toolId === 'image-compress' ? (
          <ImageCompressPage />
        ) : toolId === 'timestamp-convert' ? (
          <TimestampConvertPage />
        ) : toolId === 'base64-tool' ? (
          <Base64ToolPage />
        ) : toolId === 'qr-tool' ? (
          <QrToolPage />
        ) : toolId === 'pdf-tool' ? (
          <PdfToolPage />
        ) : toolId === 'json-formatter' ? (
          <JsonFormatterPage />
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-6">
            <div className="rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
              <div className="text-lg font-semibold text-app-text">{tool?.title ?? '未找到该工具'}</div>
              <div className="mt-2 text-sm text-app-muted">{tool?.description ?? '请返回首页选择工具。'}</div>

              <div className="mt-6 rounded-lg border border-app-border bg-app-surface2 p-4 text-sm text-app-text">
                这里是占位页面：后续你可以把每个工具拆成独立的 feature 模块（页面 + hooks + ipc + 业务逻辑）。
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
