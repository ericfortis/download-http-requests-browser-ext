const { TarWriter } = window.tarjs

const r = upsertElement

const mimes = {
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

function extForMime(mime) {
	const ext = mimes[mime]
	return ext
		? '.' + ext
		: ''
}
function mimeFor(filename) {
	const mime = mimes[filename.replace(/.*\./, '')]
	if (mime)
		return mime
	throw `Missing MIME for ${filename}`
}

const files = new Map()

const refList = useRef()

chrome.devtools.panels.create("HTTP Requests", '', "panel.html", panel => {
	panel.onShown.addListener(win => {
		win.document.body.append(
			r('div', null,
				r('a', {
					download: 'requests.tar',
					async onClick(event) {
						const writer = new TarWriter()
						for (const [filename, body] of files)
							writer.addFile(filename, body)
						const blob = await writer.write();
						event.target.href = URL.createObjectURL(blob);
					}
				}, 'Download Tar'),
				r('ul', { ref: refList })))
	})
})


chrome.devtools.network.onRequestFinished.addListener(request => {
	const { url, method } = request.request
	const { status, content } = request.response
	const path = new URL(url).pathname
	const filename = `${path}.${method}.${status}${extForMime(content.mimeType)}`
	request.getContent(body => files.set(filename, body))
	refList.current.appendChild(r('li', null, filename))
})


// https://github.com/uxtely/js-utils/blob/main/react-create-element/createElement.js
function upsertElement(elem, props, ...children) {
	const node = elem instanceof HTMLElement
		? elem
		: document.createElement(elem)
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