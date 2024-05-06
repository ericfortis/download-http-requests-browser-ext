const r = upsertElement

const refList = useRef()

chrome.devtools.panels.create("Sample Panel", '', "panel.html", panel => {
	panel.onShown.addListener(win => {
		win.document.body.append(
			r('div', null,
				r('h1', null, 'HTTP Requests'),
				r('ul', { ref: refList })))
	})
})

chrome.devtools.network.onRequestFinished.addListener(request => {
	console.log(request)
	request.getContent(body => console.log(body))
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