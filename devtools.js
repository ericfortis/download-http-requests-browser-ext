const { TarWriter } = window.tarjs

const Strings = {
  download_tar: 'Download Tar',
  filter: 'Filter',
  panel_title: 'HTTP Requests'
}

const Styles = {
  downloadTarButton: {
    background: 'dodgerblue',
    border: 0,
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    marginLeft: '12px',
    padding: '10px',
    textDecoration: 'none'
  },
  downloadIndividualResourceButton: {
    background: 'none',
    border: 0,
    color: 'dodgerblue',
    cursor: 'pointer',
    textDecoration: 'underline'
  }
}

const Mime = {
  _extensionsByMime: {
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
    'text/plain': 'txt',
    'video/mp4': 'mp4'
  },
  extensionFor(mime) {
    const ext = this._extensionsByMime[mime]
    return ext
      ? '.' + ext
      : ''
  }
}

const Files = {
  _filter: '',
  setFilter(filterText) {
    this._filter = filterText
  },
  filter(filename) {
    return filename.includes(this._filter)
  },

  _files: new Map(),
  read(filename) {
    return this._files.get(filename)
  },
  list() {
    return Array.from(this._files.keys())
  },
  insert(body, encoding, filename, mime) {
    this._files.set(filename, encoding === 'base64'
      ? this._blobFromBase64(mime, body)
      : body)
  },
  async tar() {
    const writer = new TarWriter()
    for (const [filename, body] of this._files)
      if (this.filter(filename))
        writer.addFile(filename, body)
    return await writer.write()
  },

  // https://stackoverflow.com/a/16245768
  _blobFromBase64(mime, text) {
    const byteCharacters = atob(text)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++)
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mime })
  }
}


chrome.devtools.panels.create(Strings.panel_title, '', 'panel.html', panel => {
  panel.onShown.addListener(win =>
    win.document.body.append(App()))
})
chrome.devtools.network.onRequestFinished.addListener(registerRequest)
chrome.devtools.network.onNavigated.addListener(clearList)


function registerRequest(request) {
  const { url, method } = request.request
  const { status, content } = request.response
  if (status !== 200) // Partial Content (e.g. videos) or 304's (cached)
    return
  const path = new URL(url).pathname
  const filename = `${path}.${method}.${status}${Mime.extensionFor(content.mimeType)}`
  request.getContent((body, encoding) =>
    Files.insert(body, encoding, filename, content.mimeType))
  renderList() // flushing it to avoid duplicate request entries
}

const r = createElement
const refReqList = useRef()

function App() {
  return (
    r('div', null,
      r('label', null, Strings.filter,
        r('input', {
          onKeyUp: function filterFileList() {
            Files.setFilter(this.value)
            renderList()
          }
        })),
      r('button', {
        type: 'button',
        style: Styles.downloadTarButton,
        async onClick() {
          const filename = (await urlHostname() || 'requests') + '.tar'
          download(filename, await Files.tar())
        }
      }, Strings.download_tar),
      r('ul', {
        ref: refReqList
      })))
}


function renderList() {
  clearList()
  Files.list()
    .filter(f => Files.filter(f))
    .forEach(renderFilenameOnList)
}

function renderFilenameOnList(filename) {
  if (refReqList.current)
    refReqList.current.appendChild(
      r('li', null,
        r('button', {
          type: 'button',
          style: Styles.downloadIndividualResourceButton,
          onClick() {
            download(filename, Files.read(filename))
          }
        }, filename)))
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

