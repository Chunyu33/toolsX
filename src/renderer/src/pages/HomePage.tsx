import VideoToGifPage from '../features/videoToGif/VideoToGifPage'
import ImageConvertPage from '../features/imageConvert/ImageConvertPage'
import ImageCompressPage from '../features/imageCompress/ImageCompressPage'
import ImageCropPage from '../features/imageCrop/ImageCropPage'
import SvgToolPage from '../features/svgTool/SvgToolPage'
import TimestampConvertPage from '../features/timestampConvert/TimestampConvertPage'
import Base64ToolPage from '../features/base64Tool/Base64ToolPage'
import QrToolPage from '../features/qrTool/QrToolPage'
import PdfToolPage from '../features/pdfTool/PdfToolPage'
import JsonFormatterPage from '../features/jsonFormatter/JsonFormatterPage'

type Props = {
  toolId: string
}

export default function ToolPageContainer({ toolId }: Props) {
  if (toolId === 'video-to-gif') return <VideoToGifPage />
  if (toolId === 'image-convert') return <ImageConvertPage />
  if (toolId === 'image-compress') return <ImageCompressPage />
  if (toolId === 'image-crop') return <ImageCropPage />
  if (toolId === 'svg-tool') return <SvgToolPage />
  if (toolId === 'timestamp-convert') return <TimestampConvertPage />
  if (toolId === 'base64-tool') return <Base64ToolPage />
  if (toolId === 'qr-tool') return <QrToolPage />
  if (toolId === 'pdf-tool') return <PdfToolPage />
  if (toolId === 'json-formatter') return <JsonFormatterPage />

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-sm text-app-muted">未找到该工具</div>
    </div>
  )
}
