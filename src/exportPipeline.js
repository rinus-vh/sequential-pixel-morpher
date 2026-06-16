import JSZip from 'jszip'
import { renderLiveFrame } from './livePixelSorter.js'

function pickVideoMime() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
  }
  return 'video/webm'
}

function extForMime(mime) {
  return mime.startsWith('video/mp4') ? 'mp4' : 'webm'
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function bitmapToImageData(bitmap) {
  const canvas = document.createElement('canvas')
  canvas.width  = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  return canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height)
}

export async function exportImageSequence(bitmap, hDirection, vDirection, algorithm, frameCount, onProgress) {
  const imageData    = bitmapToImageData(bitmap)
  const frameCanvas  = document.createElement('canvas')
  frameCanvas.width  = bitmap.width
  frameCanvas.height = bitmap.height
  const ctx = frameCanvas.getContext('2d')

  const zip = new JSZip()

  for (let f = 0; f <= frameCount; f++) {
    const p = f / frameCount
    renderLiveFrame(imageData, hDirection, vDirection, algorithm, p, frameCanvas)
    const dataUrl = frameCanvas.toDataURL('image/jpeg', 0.85)
    const b64     = dataUrl.split(',')[1]
    const bytes   = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    zip.file(`frame-${String(f).padStart(4, '0')}.jpg`, bytes)
    onProgress?.(Math.round((f / frameCount) * 100))
    await new Promise(r => setTimeout(r, 0))
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(blob, 'pixel-morph.zip')
}

export async function exportVideo(bitmap, hDirection, vDirection, algorithm, frameCount, fps, onProgress) {
  const mime          = pickVideoMime()
  const frameDuration = 1000 / fps
  const imageData     = bitmapToImageData(bitmap)

  const recordCanvas        = document.createElement('canvas')
  recordCanvas.width        = bitmap.width
  recordCanvas.height       = bitmap.height

  const stream   = recordCanvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 40_000_000 })
  const chunks   = []
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise(res => { recorder.onstop = res })

  renderLiveFrame(imageData, hDirection, vDirection, algorithm, 0, recordCanvas)
  recorder.start()

  for (let f = 0; f <= frameCount; f++) {
    renderLiveFrame(imageData, hDirection, vDirection, algorithm, f / frameCount, recordCanvas)
    await new Promise(r => setTimeout(r, frameDuration))
    onProgress?.(Math.round((f / frameCount) * 100))
  }

  recorder.stop()
  await done

  triggerDownload(new Blob(chunks, { type: mime }), `pixel-morph.${extForMime(mime)}`)
}
