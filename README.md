# DevTools extension for exporting HTTP requests as TAR

## Setup

Clone this repo and `npm install`

Then, **Load unpacked** extension in Chrome.

<img src="./README-screenshot.png" style="max-width: 720px" />

## Filename Convention
- path
- method
- response status
- extension based on the `Content-Type`


## Caveats
In the tar, the filename is truncated to 100 chars (the tar library uses the original
POSIX spec). But you can always click the filename to download it individually.
