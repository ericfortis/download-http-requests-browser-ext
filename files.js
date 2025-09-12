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

  useMockatonExt = true
  toggleUseMockatonExt() {
    this.useMockatonExt = !this.useMockatonExt
  }

  #files = new Map()
  read(filename) {
    return this.#files.get(filename).blob
  }
  insert(body, encoding, filename, mockatonFilename, mimeType) {
    const data = encoding === 'base64'
      ? this.#base64ToByteArray(body)
      : body
    this.#files.set(
      mockatonFilename,
      {
        path: filename,
        blob: new Blob([data], { type: mimeType })
      }
    )
  }
  
  clearList() {
    this.#files.clear()
  }

  listFiltered() {
    const result = []
    for (const [mockatonFilename, { blob, path }] of this.#files) {
      const filename = this.useMockatonExt
        ? mockatonFilename
        : path
      if (!this.#filter(filename))
        continue

      const safeFilename = this.#replaceIds(filename)
        .replace(/\/\./g, '/_.') // renames dot files with _.
      result.push([safeFilename, mockatonFilename])
    }
    return result
  }
  
  
  // TODO handle large files (chunk)
  // TODO document dot files names get renamed
  async saveAll(host) {
    const folder = `${host}_${uniqueFolderSuffix()}`

    for (const [filename, mockatonFilename] of this.listFiltered()) {
      let binary = ''
      const bytes = new Uint8Array(await this.read(mockatonFilename).arrayBuffer())
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i])

      chrome.runtime.sendMessage({
        action: 'DOWNLOAD_FILE',
        filename: folder + '/' + filename,
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
