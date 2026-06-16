/**
 * Live pixel sorter — applies the same sweeping brightness-sort interpolation
 * as the static generator but on a continuous webcam stream.
 *
 * Progress cycles 0→1→0 in a ping-pong loop. One full sweep (0→1) takes
 * `frameCount * 50 ms`, matching the static animation's playback speed so the
 * settings feel consistent between the two modes.
 *
 * Separate from pixelSorter.js so neither pipeline interferes with the other.
 */

function calcBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Renders one interpolated frame into `outputCanvas`.
 * Mirrors the renderFrame() logic in pixelSorter.js.
 */
function renderLiveFrame(imageData, direction, progress, outputCanvas) {
  const { data, width, height } = imageData
  const ascending    = direction === 'left-to-right' || direction === 'top-to-bottom'
  const isHorizontal = direction === 'left-to-right' || direction === 'right-to-left'

  const out     = new ImageData(width, height)
  const outData = out.data

  if (isHorizontal) {
    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        row.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3],
                   brightness: calcBrightness(data[i], data[i + 1], data[i + 2]),
                   originalX: x })
      }

      const sorted      = [...row].sort((a, b) => ascending ? a.brightness - b.brightness : b.brightness - a.brightness)
      const lineProgress = Math.max(0, Math.min(1, progress * 2 - y / height))

      for (let x = 0; x < width; x++) {
        const px     = row[x]
        const target = sorted[x]
        const cx     = Math.round(px.originalX + (target.originalX - px.originalX) * lineProgress)
        if (cx >= 0 && cx < width) {
          const i = (y * width + cx) * 4
          outData[i]     = px.r
          outData[i + 1] = px.g
          outData[i + 2] = px.b
          outData[i + 3] = px.a
        }
      }
    }
  } else {
    for (let x = 0; x < width; x++) {
      const col = []
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4
        col.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3],
                   brightness: calcBrightness(data[i], data[i + 1], data[i + 2]),
                   originalY: y })
      }

      const sorted      = [...col].sort((a, b) => ascending ? a.brightness - b.brightness : b.brightness - a.brightness)
      const lineProgress = Math.max(0, Math.min(1, progress * 2 - x / width))

      for (let y = 0; y < height; y++) {
        const px     = col[y]
        const target = sorted[y]
        const cy     = Math.round(px.originalY + (target.originalY - px.originalY) * lineProgress)
        if (cy >= 0 && cy < height) {
          const i = (cy * width + x) * 4
          outData[i]     = px.r
          outData[i + 1] = px.g
          outData[i + 2] = px.b
          outData[i + 3] = px.a
        }
      }
    }
  }

  outputCanvas.getContext('2d').putImageData(out, 0, 0)
}

/**
 * Starts a live pixel-sort animation loop.
 *
 * One sweep (0→1) takes `frameCount * 50 ms`, the same as the static
 * animation played back at one frame per 50 ms — so raising frameCount slows
 * the cycle and lowering it speeds it up.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {HTMLCanvasElement} outputCanvas
 * @param {string} direction
 * @param {number} frameCount
 * @returns {{ setDirection: (d: string) => void, setFrameCount: (n: number) => void, stop: () => void }}
 */
export function createLiveSorter(videoEl, outputCanvas, direction, frameCount) {
  let active           = true
  let currentDirection = direction
  let currentFrameCount = frameCount

  // progress runs 0→1→0 in a ping-pong; playDir flips sign at each end.
  let progress = 0
  let playDir  = 1
  let lastTime = null

  const srcCanvas = document.createElement('canvas')
  const srcCtx    = srcCanvas.getContext('2d', { willReadFrequently: true })

  function tick(now) {
    if (!active) return

    if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
      const w = videoEl.videoWidth
      const h = videoEl.videoHeight

      if (srcCanvas.width  !== w) srcCanvas.width  = w
      if (srcCanvas.height !== h) srcCanvas.height = h
      if (outputCanvas.width  !== w) outputCanvas.width  = w
      if (outputCanvas.height !== h) outputCanvas.height = h

      // Advance progress based on elapsed time.
      // One sweep = frameCount * 50 ms.
      const dt = lastTime == null ? 0 : now - lastTime
      const sweepDuration = currentFrameCount * 50  // ms for 0→1
      const step = dt / sweepDuration

      progress += playDir * step
      if (progress >= 1) { progress = 1; playDir = -1 }
      if (progress <= 0) { progress = 0; playDir =  1 }

      srcCtx.drawImage(videoEl, 0, 0, w, h)
      const imageData = srcCtx.getImageData(0, 0, w, h)
      renderLiveFrame(imageData, currentDirection, progress, outputCanvas)
    }

    lastTime = now
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)

  return {
    setDirection(d)  { currentDirection  = d },
    setFrameCount(n) { currentFrameCount = n },
    stop()           { active = false },
  }
}
