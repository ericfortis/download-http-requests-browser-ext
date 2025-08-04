export const mime = new class {
  #extensionsByMime = {
    'application/javascript': 'js',
    'application/json': 'json',
    'application/zip': 'zip',
    'image/avif': 'avif',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/x-icon': 'ico',
    'text/css': 'css',
    'text/html': 'html',
    'text/plain': 'txt'
  }
  extensionFor(mimeType) {
    const ext = this.#extensionsByMime[mimeType]
    return ext
      ? '.' + ext
      : '.unknown'
  }
}
