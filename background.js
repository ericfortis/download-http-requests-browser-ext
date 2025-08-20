chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'DOWNLOAD_FILE')
    chrome.downloads.download({
      url: msg.url,
      filename: msg.filename,
      saveAs: false
    })
})


