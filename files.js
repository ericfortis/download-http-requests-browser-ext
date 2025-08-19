import { BlobWriter, ZipWriter, BlobReader } from './node_modules/@zip.js/zip.js/index.min.js'


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

  /** @returns Promise */
  zip() {
    const writer = new ZipWriter(new BlobWriter('application/zip'))
    for (const [filename, blob] of this.#files)
      if (this.#filter(filename))
        writer.add(this.#replaceIds(filename), new BlobReader(blob))
    return writer.close()
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
