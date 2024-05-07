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

const extensionsByMime = {
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
}

chrome.devtools.panels.create(Strings.panel_title, '', 'panel.html', panel => {
  panel.onShown.addListener(win =>
    win.document.body.append(App()))
})
chrome.devtools.network.onRequestFinished.addListener(registerRequest)
chrome.devtools.network.onNavigated.addListener(clearList)

const Files = {
  _filter: '',
  setFilter(filterText) {
    this._filter = filterText
  },
  filter(filename) {
    return filename.includes(this._filter)
  },

  files: new Map(),
  read(filename) {
    return this.files.get(filename)
  },

  insert(body, encoding, filename, mime) {
    this.files.set(filename, encoding === 'base64'
      ? blobFromBase64(mime, body)
      : body)
  },

  async tar() {
    const writer = new TarWriter()
    for (const [filename, body] of this.files)
      if (this.filter(filename))
        writer.addFile(filename, body)
    return await writer.write()
  }
}

function registerRequest(request) {
  const { url, method } = request.request
  const { status, content } = request.response
  if (status !== 200) // Partial Content (e.g. videos) or 304's (cached)
    return
  const path = new URL(url).pathname
  const filename = `${path}.${method}.${status}${extForMime(content.mimeType)}`
  request.getContent((body, encoding) =>
    Files.insert(body, encoding, filename, content.mimeType))
  renderFilenameOnList(filename)
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
            reRenderList()
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

function renderFilenameOnList(filename) {
  if (refReqList.current && Files.filter(filename))
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

function reRenderList() {
  clearList()
  for (const [filename, body] of Files.files)
    renderFilenameOnList(filename)
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

// https://stackoverflow.com/a/16245768
function blobFromBase64(mime, text) {
  const byteCharacters = atob(text)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++)
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mime })
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

function extForMime(mime) {
  const ext = extensionsByMime[mime]
  return ext
    ? '.' + ext
    : ''
}

