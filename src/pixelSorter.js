/**
 * Calculates perceived brightness of an RGB pixel.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
function calcBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Extracts pixel lines (rows or columns) from ImageData.
 * @param {ImageData} imageData
 * @param {'left-to-right'|'right-to-left'|'top-to-bottom'|'bottom-to-top'} direction
 * @returns {Array<Array<{r,g,b,a,brightness,originalX,originalY}>>}
 */
function getPixelLines(imageData, direction) {
  const { data, width, height } = imageData
  const isHorizontal = direction === 'left-to-right' || direction === 'right-to-left'
  const lines = []

  if (isHorizontal) {
    for (let y = 0; y < height; y++) {
      const row = []
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        row.push({ r, g, b, a, brightness: calcBrightness(r, g, b), originalX: x, originalY: y })
      }
      lines.push(row)
    }
  } else {
    for (let x = 0; x < width; x++) {
      const col = []
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
        col.push({ r, g, b, a, brightness: calcBrightness(r, g, b), originalX: x, originalY: y })
      }
      lines.push(col)
    }
  }

  return lines
}

/**
 * Sort pixels by brightness, ascending or descending based on direction.
 * @param {Array} pixels
 * @param {'left-to-right'|'right-to-left'|'top-to-bottom'|'bottom-to-top'} direction
 * @returns {Array}
 */
function sortLine(pixels, direction) {
  const ascending = direction === 'left-to-right' || direction === 'top-to-bottom'
  return [...pixels].sort((a, b) => ascending ? a.brightness - b.brightness : b.brightness - a.brightness)
}

/**
 * Renders a single interpolated frame to a canvas and returns its data URL.
 * @param {Array} originalLines
 * @param {Array} sortedLines
 * @param {HTMLCanvasElement} canvas
 * @param {number} width
 * @param {number} height
 * @param {number} progress  0..1
 * @param {'left-to-right'|'right-to-left'|'top-to-bottom'|'bottom-to-top'} direction
 * @returns {string}
 */
function renderFrame(originalLines, sortedLines, canvas, width, height, progress, direction) {
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(width, height)
  const out = imageData.data
  const totalLines = originalLines.length
  const isHorizontal = direction === 'left-to-right' || direction === 'right-to-left'

  for (let li = 0; li < totalLines; li++) {
    const line = originalLines[li]
    const sorted = sortedLines[li]
    const lineProgress = Math.max(0, Math.min(1, (progress * 2) - (li / totalLines)))

    for (let pi = 0; pi < line.length; pi++) {
      const px = line[pi]
      const target = sorted[pi]
      let cx, cy
      if (isHorizontal) {
        cx = Math.round(px.originalX + (target.originalX - px.originalX) * lineProgress)
        cy = px.originalY
      } else {
        cx = px.originalX
        cy = Math.round(px.originalY + (target.originalY - px.originalY) * lineProgress)
      }
      if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
        const i = (cy * width + cx) * 4
        out[i] = px.r
        out[i + 1] = px.g
        out[i + 2] = px.b
        out[i + 3] = px.a
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Generates all morph frames from an ImageBitmap.
 * Calls onProgress(percent) and onFrame(dataUrl, index) as frames are produced.
 *
 * @param {ImageBitmap} bitmap
 * @param {'left-to-right'|'right-to-left'|'top-to-bottom'|'bottom-to-top'} direction
 * @param {number} frameCount
 * @param {(percent: number) => void} onProgress
 * @param {(dataUrl: string, index: number) => void} onFrame
 */
export async function generateMorphFrames(bitmap, direction, frameCount, onProgress, onFrame) {
  const width = bitmap.width
  const height = bitmap.height

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = width
  srcCanvas.height = height
  const srcCtx = srcCanvas.getContext('2d')
  srcCtx.drawImage(bitmap, 0, 0)
  const imageData = srcCtx.getImageData(0, 0, width, height)

  const originalLines = getPixelLines(imageData, direction)
  const sortedLines = originalLines.map(line => sortLine(line, direction))

  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = width
  frameCanvas.height = height

  for (let f = 0; f <= frameCount; f++) {
    const progress = f / frameCount
    const dataUrl = renderFrame(originalLines, sortedLines, frameCanvas, width, height, progress, direction)
    onFrame(dataUrl, f)
    onProgress(Math.round((f / frameCount) * 100))
    // yield to browser between frames
    await new Promise(r => setTimeout(r, 0))
  }
}
