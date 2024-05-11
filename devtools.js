const { TarWriter } = window.tarjs

const Strings = {
  download_tar: 'Download Tar',
  filter: 'Filter',
  panel_title: 'HTTP Requests',
  replace_ids: 'Replace GUIDs with placeholder'
}

const CSS = {
  Filter: 'Filter',
  Checkbox: 'Checkbox',
  DownloadTar: 'DownloadTar',
  FileList: 'FileList'
}

const mime = new class {
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
      : ''
  }
}

const files = new class {
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


chrome.devtools.panels.create(Strings.panel_title, '', 'panel.html', panel => {
  panel.onShown.addListener(function initOnce(win) {
    panel.onShown.removeListener(initOnce)
    win.document.body.append(App())
  })
})
chrome.devtools.network.onRequestFinished.addListener(registerRequest)
chrome.devtools.network.onNavigated.addListener(clearList)


function registerRequest(request) {
  const { url, method } = request.request
  const { status, content } = request.response
  if (status !== 200) // Partial Content (e.g. videos) or 304's (cached)
    return
  const path = new URL(url).pathname
  const filename = `${path}.${method}.${status}${mime.extensionFor(content.mimeType)}`
  request.getContent((body, encoding) =>
    files.insert(body, encoding, filename, content.mimeType))
  renderList() // full render to avoid duplicate request entries
}

const r = createElement
const refReqList = useRef()

function App() {
  return (
    r('div', null,
      r('label', { className: CSS.Filter }, Strings.filter,
        r('input', {
          onKeyUp: function filterFileList() {
            files.setFilter(this.value)
            renderList()
          }
        })),
      r('label', { className: CSS.Checkbox },
        r('input', {
          type: 'checkbox',
          onChange() {
            files.toggleReplaceIds()
            renderList()
          }
        }),
        Strings.replace_ids),
      r('button', {
        type: 'button',
        className: CSS.DownloadTar,
        async onClick() {
          const filename = (await urlHostname() || 'requests') + '.tar'
          download(filename, await files.tar())
        }
      }, Strings.download_tar),
      r('ul', {
        ref: refReqList,
        className: CSS.FileList
      })))
}


function renderList() {
  if (!refReqList.current)
    return

  clearList()
  for (const [filename, editedFilename] of files.listFiltered())
    refReqList.current.appendChild(
      r('li', null,
        r('button', {
          type: 'button',
          onClick() { download(editedFilename, files.read(filename)) }
        }, editedFilename)))
}

function clearList() {
  if (refReqList.current)
    while (refReqList.current.firstChild)
      refReqList.current.removeChild(refReqList.current.firstChild)
}


/* === Utils === */

function urlHostname() {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval('location.href', (response, error) => {
      if (error)
        resolve('')
      else
        resolve(new URL(response).hostname)
    })
  })
}

// https://stackoverflow.com/a/19328891
function download(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = r('a', {
    href: url,
    download: filename
  })
  a.click()
  URL.revokeObjectURL(url)
}

// API similar to React.createElement
// https://github.com/uxtely/js-utils/blob/main/react-create-element/createElement.js
function createElement(elem, props, ...children) {
  const node = document.createElement(elem)
  if (props)
    for (const [key, value] of Object.entries(props))
      if (key === 'ref')
        value.current = node
      else if (key === 'style')
        Object.assign(node.style, value)
      else if (key.startsWith('on'))
        node.addEventListener(key.replace(/^on/, '').toLowerCase(), value)
      else if (key in node)
        node[key] = value
      else
        node.setAttribute(key, value)
  node.append(...children)
  return node
}

function useRef() {
  return { current: null }
}

