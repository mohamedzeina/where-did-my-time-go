/** Saves `content` as a file through the browser's download flow. */
export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before the URL is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
