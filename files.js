export const files = new class {
  #filterString = ''
  #filterIsRegex = false
  #filter(filename) {
    return this.#filterIsRegex
      ? new RegExp(this.#filterString).test(filename)
      : filename.includes(this.#filterString)
  }
  setFilter(filterText) {
    this.#filterString = filterText
  }
  toggleFilterIsRegex() {
    this.#filterIsRegex = !this.#filterIsRegex
  }

  #reUuidV4 = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi
  #shouldReplaceIds = false
  toggleReplaceIds() {
    this.#shouldReplaceIds = !this.#shouldReplaceIds
  }
  #replaceIds(filename) {
    return this.#shouldReplaceIds
      ? filename.replaceAll(this.#reUuidV4, '[id]')
      : filename
  }

  #files = new Map()
  read(filename) {
    return this.#files.get(filename)
  }
  listFiltered() {
    return this.#files.keys()
      .filter(f => this.#filter(f))
      .map(f => [f, this.#replaceIds(f)])
  }
  insert(body, encoding, filename, mimeType) {
    const data = encoding === 'base64'
      ? this.#base64ToByteArray(body)
      : body
    this.#files.set(filename, new Blob([data], { type: mimeType }))
  }

  // TODO handle large files (chunk)
  // TODO document dot files names
  async saveAll(host) {
    const folder = `${host}_${uniqueFolderSuffix()}`

    for (const [filename, blob] of this.#files) {
      if (!this.#filter(filename))
        continue

      const safeFilename = this.#replaceIds(filename)
        .replace(/\/\./g, '/_.') // rename dot files with _.

      let binary = ''
      const bytes = new Uint8Array(await blob.arrayBuffer())
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i])

      chrome.runtime.sendMessage({
        action: 'DOWNLOAD_FILE',
        filename: folder + '/' + safeFilename,
        url: `data:application/octet-stream;base64,${btoa(binary)}`
      })
    }
  }

  // https://stackoverflow.com/a/16245768
  #base64ToByteArray(text) {
    const decoded = atob(text)
    const bytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++)
      bytes[i] = decoded.charCodeAt(i)
    return bytes
  }
}

function uniqueFolderSuffix() {
  return new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/,?\s+/g, '_')
}
