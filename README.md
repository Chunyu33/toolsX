# ToolsX

一个基于 **Electron + React（Vite）+ TailwindCSS** 的桌面工具集合应用。

当前已包含（持续扩展中）：

- **视频转 GIF**：裁剪时间段、设置帧率/宽度后输出 GIF。
- **图片格式转换**：PNG/JPG/WebP/AVIF/GIF/ICO 输出（支持多选批处理、预览、保存 ZIP）。
- **图片压缩**：按目标体积（KB）压缩图片，自动选择更小输出策略（优先 WebP/AVIF）。
- **JSON 格式化**：格式化/压缩/校验，支持高亮展示与复制提示。

## 开发运行

在项目根目录：

- **安装依赖**：`npm i`
- **开发启动**：`npm run dev`

说明：

- 图片处理依赖 `sharp`（以及输出 ICO 时的 `png-to-ico`）。
- 批量保存 ZIP 依赖 `archiver`。

## 目录结构（重点）

```
src/
  main/                 # 主进程：窗口、IPC 注册、业务服务（读写文件、图片/视频处理等）
    ipc/                # ipcMain.handle(...) 注册入口
    services/           # 业务服务（如 imageConvert.ts）

  preload/              # 预加载：contextBridge 暴露安全 API 给渲染进程
    bridge.ts

  renderer/             # 渲染进程：React UI（Vite + Tailwind）
    src/
      pages/            # 页面（HomePage / ToolPage）
      features/         # 具体工具模块（VideoToGif / ImageConvert / ImageCompress / JsonFormatter）
      components/       # 通用组件（Header / Toast / JsonCodeBlock / ImagePreviewModal 等）
      utils/            # 纯前端工具（如 filePath.ts，避免使用 Node path）

  shared/               # 跨进程共享：类型、IPC channel 常量
    ipc.ts
    types.ts
```

## 渲染进程 → 主进程调用链（IPC）

本项目采用 **renderer（React） → preload（contextBridge） → main（ipcMain.handle） → service（业务逻辑）** 的分层方式。

核心目标：

- 渲染进程只负责 UI 与状态管理
- 主进程负责文件系统访问、CPU 密集型处理（sharp/ffmpeg）、系统对话框
- 通过 `preload` 暴露最小必要能力，避免 `nodeIntegration` 带来的安全/兼容风险

### 1) IPC 通道定义：`src/shared/ipc.ts`

- 统一维护所有 IPC channel 常量（例如 `files:openImages`、`imageConvert:convert`）
- preload 与 main 通过该常量保持一致

### 2) 预加载桥接：`src/preload/bridge.ts`

- 使用 `contextBridge.exposeInMainWorld('toolsx', api)` 暴露 `window.toolsx`
- 渲染进程调用 `window.toolsx.xxx()`，实际由 `ipcRenderer.invoke(channel, args)` 转发

示例（概念，非完整代码）：

```ts
// src/preload/bridge.ts
cleanupTempImages: (args) => ipcRenderer.invoke(IpcChannels.FilesCleanupTempImages, args)
```

### 3) 主进程 IPC 注册：`src/main/ipc/*`

- 在主进程中通过 `ipcMain.handle(channel, handler)` 接收 invoke 请求并返回结果
- handler 中通常只负责：参数校验 / 调用 service / 返回 payload

示例（概念，非完整代码）：

```ts
// src/main/ipc/files.ts
ipcMain.handle(IpcChannels.FilesSaveZip, async (_event, args) => {
  // 1) 弹出保存对话框
  // 2) 用 archiver 写入 zip
  // 3) 返回 savedPath 给渲染进程
})
```

### 4) 业务服务层：`src/main/services/*`

- 将具体业务逻辑从 IPC handler 中剥离出来，方便复用、测试、维护

例如：

- `src/main/services/imageConvert.ts`：图片转换/压缩逻辑（sharp、目标体积优化、输出 ICO 等）

## 两个典型调用链示例

### 示例 A：图片转换（ImageConvert）

1. **renderer**：页面触发转换
   - 文件：`src/renderer/src/features/imageConvert/ImageConvertPage.tsx`
   - 调用：

```ts
await window.toolsx.imageConvert.convert({
  mode: 'convert',
  inputPath,
  format,
  quality
})
```

2. **preload**：桥接 invoke
   - 文件：`src/preload/bridge.ts`
   - 核心：`ipcRenderer.invoke(IpcChannels.ImageConvertConvert, args)`

3. **main ipc**：接收并转业务服务
   - 文件：`src/main/ipc/imageConvert.ts`
   - 核心：`ipcMain.handle(IpcChannels.ImageConvertConvert, ...)`

4. **service**：执行转换并写入临时目录
   - 文件：`src/main/services/imageConvert.ts`
   - 输出写入：`app.getPath('temp')/toolsx-imgc-*`
   - 返回 `{ outputPath, format, sizeBytes, quality? }`

5. **renderer**：展示预览 / 保存
   - 使用 `toLocalfileUrl(outputPath)` 预览
   - 使用 `files.saveImage` 或 `files.saveZip` 保存到用户选择位置

### 示例 B：批量保存 ZIP（SaveZip）

1. **renderer**：聚合输出列表
   - 文件：`ImageConvertPage.tsx` / `ImageCompressPage.tsx`
   - 将多个 `{ sourcePath, name }` 传给：

```ts
await window.toolsx.files.saveZip({
  entries: outputs.map((it) => ({ sourcePath: it.outputPath, name: it.name })),
  defaultName: 'converted.zip',
  readmeText
})
```

2. **preload**：桥接到 `ipcRenderer.invoke`
   - 文件：`src/preload/bridge.ts`

3. **main ipc**：弹窗选择路径并打包
   - 文件：`src/main/ipc/files.ts`
   - 依赖：`archiver`
   - 返回 `{ savedPath }`

## 重要约束/约定

- **renderer 不使用 Node 内置模块**（如 `path`）：
  - Vite 会 externalize，且不符合安全隔离策略。
  - 需要路径处理时，使用 `src/renderer/src/utils/filePath.ts`（字符串方式）。

- **临时文件策略**：
  - 图片转换/压缩结果会先落盘到系统临时目录（已落盘，不是仅内存）。
  - 用户点击“保存/保存压缩包”是复制/打包到最终位置。
