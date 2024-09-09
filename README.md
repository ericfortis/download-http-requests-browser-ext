# DevTools extension for exporting HTTP requests as Tar

## Setup

Clone this repo and `npm install`

Then, "Load unpacked" extension, in Chrome

## Filename Convention
- path
- method
- response status
- extension based on the `Content-Type`

<img src="./README-screenshot.png" style="max-width: 540px" />

## Caveats
In the tar, the filename is truncated to 100 chars (the tar library uses the original
POSIX spec). But you can always click the filename to download it individually.


## License
ISC
