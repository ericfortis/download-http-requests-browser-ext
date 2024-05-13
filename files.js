const { TarWriter } = window.tarjs

export const files = new class {
  #filterString = ''
  #filter(filename) {
    return filename.includes(this.#filterString)
  }
  setFilter(filterText) {
    this.#filterString = filterText
  }

  #reUuidV4 = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi
  #shouldReplaceIds = false
  toggleReplaceIds() {
    this.#shouldReplaceIds = !this.#shouldReplaceIds
  }
  #replaceIds(filename) {
    return this.#shouldReplaceIds
      ? filename.replaceAll(this.#reUuidV4, '<id>')
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

  /** @returns Promise */
  tar() {
    const writer = new TarWriter()
    for (const [filename, body] of this.#files)
      if (this.#filter(filename))
        writer.addFile(this.#replaceIds(filename), body)
    return writer.write()
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
