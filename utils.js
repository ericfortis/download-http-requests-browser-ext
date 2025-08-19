export function urlHostname() {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval('location.href', (response, error) => {
      if (error)
        resolve('')
      else
        resolve(new URL(response).hostname)
    })
  })
}

export function removeTrailingSlash(path) {
  return path.replace(/\/$/, '')
}

// https://stackoverflow.com/a/19328891
export function download(filename, blob) {
  const url = URL.createObjectURL(blob)
  const a = createElement('a', {
    href: url,
    download: filename
  })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// API similar to React.createElement
// https://github.com/uxtely/js-utils/blob/main/react-create-element/createElement.js
export function createElement(elem, props, ...children) {
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

export function useRef() {
  return { current: null }
}

