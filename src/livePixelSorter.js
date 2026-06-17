/**
 * Live and static-image pixel sorters.
 *
 * Algorithms:
 *   'sort-brightness' — sort by perceived brightness (luma). Correct lerp formula.
 *   'sort-hue'        — sort by HSL hue (0–360°). Correct lerp formula.
 *   'sort-saturation' — sort by HSL saturation (0–1). Correct lerp formula.
 *   'swap'            — original swap formula: pixel at position x moves toward
 *                       sorted[x].originalX (interleaving sweep visual).
 *
 * For all non-'swap' algorithms the rank-r pixel moves FROM its original
 * position TO sorted position r (mathematically correct for all permutations).
 *
 * Dual direction: H pass runs first, V pass runs on its output.
 */

function calcBrightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function calcHue(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d   = max - min
  if (d === 0) return 0
  let h
  if      (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else                h = (r - g) / d + 4
  h = h * 60
  return h < 0 ? h + 360 : h
}

function calcSaturation(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d   = max - min
  if (d === 0) return 0
  const l = (max + min) / 2
  return d / (1 - Math.abs(2 * l - 1))
}

/** Returns the sort key value for a pixel given the algorithm. */
function sortKey(px, algorithm) {
  if (algorithm === 'sort-hue')        return px.hue
  if (algorithm === 'sort-saturation') return px.saturation
  return px.brightness  // sort-brightness + swap both use brightness
}

function sortPixels(pixels, ascending, algorithm) {
  return [...pixels].sort((a, b) => {
    const ka = sortKey(a, algorithm)
    const kb = sortKey(b, algorithm)
    return ascending ? ka - kb : kb - ka
  })
}

/** Returns true when this algorithm uses the correct rank-based lerp (vs the swap formula). */
function rankLerp(algorithm) {
  return algorithm !== 'swap'
}

/** Ascending direction for a horizontal pass given the algorithm. */
function hAscending(algorithm, direction) {
  return rankLerp(algorithm)
    ? direction === 'right-to-left'
    : direction === 'left-to-right'
}

/** Ascending direction for a vertical pass given the algorithm. */
function vAscending(algorithm, direction) {
  return rankLerp(algorithm)
    ? direction === 'bottom-to-top'
    : direction === 'top-to-bottom'
}

// ── Inner lerp loops ─────────────────────────────────────────────────────────

// Writes sorted-and-lerped rows from (row[], sortedRow[]) into dst ImageData.
// No sorting happens here — sort data is pre-computed.
function lerpRowsToBuffer(rows, sortedRows, width, height, isSortLtD, progress, dst) {
  const dstData = dst.data
  for (let y = 0; y < height; y++) {
    const row    = rows[y]
    const sorted = sortedRows[y]
    const lp     = Math.max(0, Math.min(1, progress * 2 - y / height))

    if (isSortLtD) {
      for (let r = 0; r < width; r++) {
        const px = sorted[r]
        const cx = Math.round(px.originalX + (r - px.originalX) * lp)
        if (cx >= 0 && cx < width) {
          const i = (y * width + cx) * 4
          dstData[i] = px.r; dstData[i+1] = px.g; dstData[i+2] = px.b; dstData[i+3] = px.a
        }
      }
    } else {
      for (let x = 0; x < width; x++) {
        const px  = row[x]
        const tgt = sorted[x]
        const cx  = Math.round(px.originalX + (tgt.originalX - px.originalX) * lp)
        if (cx >= 0 && cx < width) {
          const i = (y * width + cx) * 4
          dstData[i] = px.r; dstData[i+1] = px.g; dstData[i+2] = px.b; dstData[i+3] = px.a
        }
      }
    }
  }
}

// Writes sorted-and-lerped cols from (col[], sortedCol[]) into dst ImageData.
function lerpColsToBuffer(cols, sortedCols, width, height, isSortLtD, progress, dst) {
  const dstData = dst.data
  for (let x = 0; x < width; x++) {
    const col    = cols[x]
    const sorted = sortedCols[x]
    const lp     = Math.max(0, Math.min(1, progress * 2 - x / width))

    if (isSortLtD) {
      for (let r = 0; r < height; r++) {
        const px = sorted[r]
        const cy = Math.round(px.originalY + (r - px.originalY) * lp)
        if (cy >= 0 && cy < height) {
          const i = (cy * width + x) * 4
          dstData[i] = px.r; dstData[i+1] = px.g; dstData[i+2] = px.b; dstData[i+3] = px.a
        }
      }
    } else {
      for (let y = 0; y < height; y++) {
        const px  = col[y]
        const tgt = sorted[y]
        const cy  = Math.round(px.originalY + (tgt.originalY - px.originalY) * lp)
        if (cy >= 0 && cy < height) {
          const i = (cy * width + x) * 4
          dstData[i] = px.r; dstData[i+1] = px.g; dstData[i+2] = px.b; dstData[i+3] = px.a
        }
      }
    }
  }
}

// ── Row/col extractors (with sorting) ────────────────────────────────────────

function extractAndSortRows(imageData, hDirection, algorithm) {
  const { data, width, height } = imageData
  const ascending = hAscending(algorithm, hDirection)
  const rows = [], sortedRows = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i], g = data[i+1], b = data[i+2]
      row.push({ r, g, b, a: data[i+3],
        brightness: calcBrightness(r, g, b),
        hue: calcHue(r, g, b),
        saturation: calcSaturation(r, g, b),
        originalX: x })
    }
    rows.push(row)
    sortedRows.push(sortPixels(row, ascending, algorithm))
  }
  return { rows, sortedRows }
}

function extractAndSortCols(imageData, vDirection, algorithm) {
  const { data, width, height } = imageData
  const ascending = vAscending(algorithm, vDirection)
  const cols = [], sortedCols = []
  for (let x = 0; x < width; x++) {
    const col = []
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4
      const r = data[i], g = data[i+1], b = data[i+2]
      col.push({ r, g, b, a: data[i+3],
        brightness: calcBrightness(r, g, b),
        hue: calcHue(r, g, b),
        saturation: calcSaturation(r, g, b),
        originalY: y })
    }
    cols.push(col)
    sortedCols.push(sortPixels(col, ascending, algorithm))
  }
  return { cols, sortedCols }
}

// ── Per-frame pass functions (sorting happens inside — for live use) ──────────

function renderRowsToBuffer(srcData, direction, algorithm, progress, dstData) {
  const { width, height } = srcData
  const { rows, sortedRows } = extractAndSortRows(srcData, direction, algorithm)
  lerpRowsToBuffer(rows, sortedRows, width, height, rankLerp(algorithm), progress, dstData)
}

function renderColsToBuffer(srcData, direction, algorithm, progress, dstData) {
  const { width, height } = srcData
  const { cols, sortedCols } = extractAndSortCols(srcData, direction, algorithm)
  lerpColsToBuffer(cols, sortedCols, width, height, rankLerp(algorithm), progress, dstData)
}

// ── Main frame renderer (live, re-sorts every frame) ─────────────────────────

function renderLiveFrame(imageData, hDirection, vDirection, algorithm, progress, outputCanvas) {
  const { width, height } = imageData
  const ctx = outputCanvas.getContext('2d')

  if (hDirection && vDirection) {
    const intermediate = new ImageData(width, height)
    renderRowsToBuffer(imageData, hDirection, algorithm, progress, intermediate)
    const final = new ImageData(width, height)
    renderColsToBuffer(intermediate, vDirection, algorithm, progress, final)
    ctx.putImageData(final, 0, 0)
  } else if (hDirection) {
    const out = new ImageData(width, height)
    renderRowsToBuffer(imageData, hDirection, algorithm, progress, out)
    ctx.putImageData(out, 0, 0)
  } else if (vDirection) {
    const out = new ImageData(width, height)
    renderColsToBuffer(imageData, vDirection, algorithm, progress, out)
    ctx.putImageData(out, 0, 0)
  } else {
    ctx.putImageData(imageData, 0, 0)
  }
}

export { renderLiveFrame }

// ── Pre-render: sort ONCE, lerp per frame (fast) ─────────────────────────────

/**
 * Generates all frames as ImageBitmaps by:
 * 1. Sorting rows/cols once (the slow part)
 * 2. Only lerping per frame (the fast part)
 *
 * For dual H+V: rows are pre-sorted (fast H pass), columns are still sorted per
 * frame because V input changes each frame (H output varies with progress).
 *
 * onProgress receives values 0→1 as frames complete.
 */
export async function preRenderAllFrames(imageData, hDirection, vDirection, algorithm, frameCount, onProgress) {
  const { width, height } = imageData
  const isSortLtD = rankLerp(algorithm)

  // Sort rows once if needed
  let hData = null
  if (hDirection) {
    hData = extractAndSortRows(imageData, hDirection, algorithm)
    await new Promise(r => setTimeout(r, 0))
  }

  // Sort cols once only for pure-V (H+V can't pre-sort V because its input changes per frame)
  let vData = null
  if (vDirection && !hDirection) {
    vData = extractAndSortCols(imageData, vDirection, algorithm)
    await new Promise(r => setTimeout(r, 0))
  }

  const renderCanvas    = document.createElement('canvas')
  renderCanvas.width    = width
  renderCanvas.height   = height
  const ctx             = renderCanvas.getContext('2d')
  const bitmaps         = []

  for (let f = 0; f <= frameCount; f++) {
    const p = f / frameCount

    if (!hDirection && !vDirection) {
      ctx.putImageData(imageData, 0, 0)

    } else if (hData && !vDirection) {
      // Pure H — lerp only, no sort
      const out = new ImageData(width, height)
      lerpRowsToBuffer(hData.rows, hData.sortedRows, width, height, isSortLtD, p, out)
      ctx.putImageData(out, 0, 0)

    } else if (vData) {
      // Pure V — lerp only, no sort
      const out = new ImageData(width, height)
      lerpColsToBuffer(vData.cols, vData.sortedCols, width, height, isSortLtD, p, out)
      ctx.putImageData(out, 0, 0)

    } else {
      // Dual H+V: H is pre-sorted (fast lerp), V still sorts per frame
      const hOut = new ImageData(width, height)
      lerpRowsToBuffer(hData.rows, hData.sortedRows, width, height, isSortLtD, p, hOut)
      const vOut = new ImageData(width, height)
      renderColsToBuffer(hOut, vDirection, algorithm, p, vOut)
      ctx.putImageData(vOut, 0, 0)
    }

    const bmp = await createImageBitmap(ctx.getImageData(0, 0, width, height))
    bitmaps.push(bmp)
    onProgress?.(f / frameCount)
    if (f % 4 === 0) await new Promise(r => setTimeout(r, 0))
  }

  return bitmaps
}

// ── Live feed sorter (webcam) ────────────────────────────────────────────────

export function createLiveSorter(videoEl, outputCanvas, hDirection, vDirection, algorithm, frameCount, onTick) {
  let active            = true
  let currentHDirection = hDirection
  let currentVDirection = vDirection
  let currentAlgorithm  = algorithm
  let currentFrameCount = frameCount
  let looping           = true
  let paused            = false

  let progress    = 0
  let playDir     = 1
  let lastTime    = null
  let lastTickTime = 0

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

      if (!paused) {
        const dt            = lastTime === null ? 0 : now - lastTime
        const sweepDuration = currentFrameCount * 50
        const step          = dt / sweepDuration

        progress += playDir * step

        if (step > 0) {
          if (progress >= 1) {
            progress = 1
            if (looping) { playDir = -1 } else { paused = true }
          }
          if (progress <= 0) {
            progress = 0
            if (looping) { playDir = 1 } else { paused = true }
          }
        }
      }

      srcCtx.drawImage(videoEl, 0, 0, w, h)
      const imageData = srcCtx.getImageData(0, 0, w, h)
      renderLiveFrame(imageData, currentHDirection, currentVDirection, currentAlgorithm, progress, outputCanvas)

      if (onTick && now - lastTickTime >= 50) {
        onTick(progress)
        lastTickTime = now
      }
    }

    lastTime = now
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)

  return {
    setHDirection(d)  { currentHDirection = d },
    setVDirection(d)  { currentVDirection = d },
    setAlgorithm(a)   { currentAlgorithm  = a },
    setFrameCount(n)  { currentFrameCount = n },
    setPaused(v) {
      paused = v
      if (!v) {
        lastTime = null
        if (progress <= 0) { playDir = 1 }
        else if (progress >= 1) { if (looping) { playDir = -1 } else { progress = 0; playDir = 1 } }
      }
    },
    setLoop(v)        { looping = v },
    setProgress(p)    { progress = Math.max(0, Math.min(1, p)) },
    isPaused()        { return paused },
    stop()            { active = false },
  }
}

// ── Static image sorter ──────────────────────────────────────────────────────

export function createImageSorter(imageData, outputCanvas, hDirection, vDirection, algorithm, frameCount, onTick) {
  let active            = true
  let currentHDirection = hDirection
  let currentVDirection = vDirection
  let currentAlgorithm  = algorithm
  let currentFrameCount = frameCount
  let looping           = true
  let preRenderedFrames = null  // ImageBitmap[]

  let progress    = 0
  let playDir     = 1
  let lastTime    = null
  let paused      = false
  let lastTickTime = 0

  const { width, height } = imageData
  outputCanvas.width  = width
  outputCanvas.height = height

  // Pre-sort rows/cols once — lerp-only in the tick loop (fast)
  let preSortH = null  // { rows, sortedRows }
  let preSortV = null  // { cols, sortedCols }

  function reSort() {
    preSortH = currentHDirection
      ? extractAndSortRows(imageData, currentHDirection, currentAlgorithm)
      : null
    // Pure-V only: pre-sort cols. Dual H+V: V sorts per frame (input varies).
    preSortV = (currentVDirection && !currentHDirection)
      ? extractAndSortCols(imageData, currentVDirection, currentAlgorithm)
      : null
  }

  reSort()

  function renderFrame(p) {
    const isSortLtD = currentAlgorithm === 'sort-light-to-dark'
    const ctx = outputCanvas.getContext('2d')

    if (!currentHDirection && !currentVDirection) {
      ctx.putImageData(imageData, 0, 0)
      return
    }

    if (preSortH && !currentVDirection) {
      const out = new ImageData(width, height)
      lerpRowsToBuffer(preSortH.rows, preSortH.sortedRows, width, height, isSortLtD, p, out)
      ctx.putImageData(out, 0, 0)
      return
    }

    if (preSortV) {
      const out = new ImageData(width, height)
      lerpColsToBuffer(preSortV.cols, preSortV.sortedCols, width, height, isSortLtD, p, out)
      ctx.putImageData(out, 0, 0)
      return
    }

    // Dual H+V: pre-sorted H lerp (fast), V sort+lerp per frame (unavoidable)
    if (preSortH && currentVDirection) {
      const hOut = new ImageData(width, height)
      lerpRowsToBuffer(preSortH.rows, preSortH.sortedRows, width, height, isSortLtD, p, hOut)
      const vOut = new ImageData(width, height)
      renderColsToBuffer(hOut, currentVDirection, currentAlgorithm, p, vOut)
      ctx.putImageData(vOut, 0, 0)
    }
  }

  function tick(now) {
    if (!active) return

    if (!paused) {
      const dt            = lastTime === null ? 0 : now - lastTime
      const sweepDuration = currentFrameCount * 50
      const step          = dt / sweepDuration

      progress += playDir * step

      if (step > 0) {
        if (progress >= 1) {
          progress = 1
          if (looping) { playDir = -1 } else { paused = true; onTick?.(progress) }
        }
        if (progress <= 0) {
          progress = 0
          if (looping) { playDir = 1 } else { paused = true; onTick?.(progress) }
        }
      }
    }

    if (preRenderedFrames) {
      const idx = Math.round(progress * (preRenderedFrames.length - 1))
      outputCanvas.getContext('2d').drawImage(preRenderedFrames[idx], 0, 0)
    } else {
      renderFrame(progress)
    }

    if (onTick && now - lastTickTime >= 50) {
      onTick(progress)
      lastTickTime = now
    }

    lastTime = now
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)

  return {
    setHDirection(d)       { currentHDirection = d; preRenderedFrames = null; reSort() },
    setVDirection(d)       { currentVDirection = d; preRenderedFrames = null; reSort() },
    setAlgorithm(a)        { currentAlgorithm  = a; preRenderedFrames = null; reSort() },
    setFrameCount(n)       { currentFrameCount = n },
    setPreRendered(frames) { preRenderedFrames = frames },
    setLoop(v)             { looping = v },
    setPaused(v) {
      paused = v
      if (!v) {
        lastTime = null
        if (progress <= 0) { playDir = 1 }
        else if (progress >= 1) { if (looping) { playDir = -1 } else { progress = 0; playDir = 1 } }
      }
    },
    setProgress(p)         { progress = Math.max(0, Math.min(1, p)) },
    isPaused()             { return paused },
    stop()                 { active = false },
  }
}
