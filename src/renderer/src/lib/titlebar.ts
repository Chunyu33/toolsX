export function stopPropagation(e: { stopPropagation: () => void }): void {
  e.stopPropagation()
}
