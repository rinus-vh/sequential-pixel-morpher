function calcBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

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

function sortLine(pixels, direction, algorithm) {
  const ascending = algorithm === 'sort-light-to-dark'
    ? direction === 'right-to-left' || direction === 'bottom-to-top'
    : direction === 'left-to-right' || direction === 'top-to-bottom'
  return [...pixels].sort((a, b) => ascending ? a.brightness - b.brightness : b.brightness - a.brightness)
}

function paintFrameInternal(originalLines, sortedLines, canvas, width, height, progress, direction, algorithm) {
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(width, height)
  const out = imageData.data
  const totalLines = originalLines.length
  const isHorizontal = direction === 'left-to-right' || direction === 'right-to-left'
  const isSortLtD    = algorithm === 'sort-light-to-dark'

  for (let li = 0; li < totalLines; li++) {
    const line   = originalLines[li]
    const sorted = sortedLines[li]
    const lineProgress = Math.max(0, Math.min(1, (progress * 2) - (li / totalLines)))

    if (isSortLtD) {
      // Each rank-r pixel moves from its original position to sorted position r
      for (let r = 0; r < sorted.length; r++) {
        const px = sorted[r]
        let cx, cy
        if (isHorizontal) {
          cx = Math.round(px.originalX + (r - px.originalX) * lineProgress)
          cy = px.originalY
        } else {
          cx = px.originalX
          cy = Math.round(px.originalY + (r - px.originalY) * lineProgress)
        }
        if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
          const i = (cy * width + cx) * 4
          out[i]     = px.r
          out[i + 1] = px.g
          out[i + 2] = px.b
          out[i + 3] = px.a
        }
      }
    } else {
      // Original formula: pixel at original position pi moves toward sorted[pi].originalX/Y
      for (let pi = 0; pi < line.length; pi++) {
        const px     = line[pi]
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
          out[i]     = px.r
          out[i + 1] = px.g
          out[i + 2] = px.b
          out[i + 3] = px.a
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

// Paints a frame to canvas and returns its data URL (used for image sequence export)
function renderFrame(originalLines, sortedLines, canvas, width, height, progress, direction, algorithm) {
  paintFrameInternal(originalLines, sortedLines, canvas, width, height, progress, direction, algorithm)
  return canvas.toDataURL('image/jpeg', 0.85)
}

// Paints a frame to canvas without the data URL overhead (used for video recording)
export function paintSortFrame(originalLines, sortedLines, canvas, width, height, progress, direction, algorithm) {
  paintFrameInternal(originalLines, sortedLines, canvas, width, height, progress, direction, algorithm)
}

// Extracts and sorts pixel lines from a bitmap (used by video export to avoid re-sorting per frame)
export function prepareSortData(bitmap, direction, algorithm) {
  const width = bitmap.width
  const height = bitmap.height

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = width
  srcCanvas.height = height
  const ctx = srcCanvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, width, height)

  const originalLines = getPixelLines(imageData, direction)
  const sortedLines = originalLines.map(line => sortLine(line, direction, algorithm))

  return { originalLines, sortedLines, width, height }
}

export async function generateMorphFrames(bitmap, direction, algorithm, frameCount, onProgress, onFrame) {
  const width = bitmap.width
  const height = bitmap.height

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = width
  srcCanvas.height = height
  const srcCtx = srcCanvas.getContext('2d')
  srcCtx.drawImage(bitmap, 0, 0)
  const imageData = srcCtx.getImageData(0, 0, width, height)

  const originalLines = getPixelLines(imageData, direction)
  const sortedLines = originalLines.map(line => sortLine(line, direction, algorithm))

  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = width
  frameCanvas.height = height

  for (let f = 0; f <= frameCount; f++) {
    const progress = f / frameCount
    const dataUrl = renderFrame(originalLines, sortedLines, frameCanvas, width, height, progress, direction, algorithm)
    onFrame(dataUrl, f)
    onProgress(Math.round((f / frameCount) * 100))
    await new Promise(r => setTimeout(r, 0))
  }
}
