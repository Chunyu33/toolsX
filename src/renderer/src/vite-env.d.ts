/// <reference types="vite/client" />

declare global {
  interface Window {
    toolsx: import('../../preload/bridge').ToolsXApi
  }
}

export {}
