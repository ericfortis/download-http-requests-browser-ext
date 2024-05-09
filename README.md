# DevTools extension for exporting HTTP requests as Tar


## Filename Convention
- path
- method
- response status
- extension based on the `Content-Type`

![extension screenshot](./README-screenshot.png)

## Caveats
In the tar, the filename is truncated to 100 chars (the tar library uses the original
POSIX spec). But you can always click the filename to download it individually.

## Setup
```npm install```

Then, "Load unpacked" extension

## License
ISC
