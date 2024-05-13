import { files } from './files.js'
import { mime } from './mime.js'
import { urlHostname, useRef, download, createElement as r } from './utils.js'


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
