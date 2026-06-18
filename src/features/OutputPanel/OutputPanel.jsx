import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Repeat, Square, Video, X, CircleDot } from 'lucide-react'
import { ActionIconButton, ActionIconButtonToggle, FileUpload, GhostButton, Loader, Modal } from '@6njp/prototype-library'

import { createLiveSorter, createImageSorter } from '@/livePixelSorter.js'
import { WebcamCapture } from '@/features/WebcamCapture/WebcamCapture.jsx'

import styles from './OutputPanel.module.css'

export function OutputPanel({
  image,
  algorithm,
  hDirection,
  vDirection,
  frameCount,
  preRenderedFrames,
  isPreRendering,
  preRenderProgress,
  liveActive,
  bwEnabled,
  overlayEnabled,
  overlayColor,
  bgColor,
  onImage,
  onRegisterDownload,
  onRegisterStopFeed,
  onLiveActive,
}) {
  // ── Live feed state ──────────────────────────────────────────────────────
  const [feedOpen,  setFeedOpen]  = useState(false)
  const [stream,    setStream]    = useState(null)
  const [feedError, setFeedError] = useState(null)

  // ── Image animation state ────────────────────────────────────────────────
  const [imagePaused,  setImagePaused]  = useState(false)
  const [isLooping,    setIsLooping]    = useState(true)
  const [liveProgress, setLiveProgress] = useState(0)

  const liveVideoRef    = useRef(null)
  const outputCanvasRef = useRef(null)
  const sorterRef       = useRef(null)
  const scrubTrackRef   = useRef(null)
  const isDraggingRef   = useRef(false)

  // ── Register download fn so SettingsPanel can trigger it ─────────────────
  useEffect(() => {
    onRegisterDownload?.(() => {
      const canvas = outputCanvasRef.current
      if (!canvas) return
      const url = canvas.toDataURL('image/png')
      const a   = document.createElement('a')
      a.href     = url
      a.download = 'frame.png'
      a.click()
    })
  }, [onRegisterDownload])

  // ── Register stopFeed fn so SettingsPanel can trigger it ─────────────────
  useEffect(() => {
    onRegisterStopFeed?.(stopFeed)
  }) // intentionally no deps — stopFeed closes over current stream/sorter

  // ── Start/stop image sorter when image or live mode changes ──────────────
  useEffect(() => {
    if (!image || liveActive) return

    const srcCanvas = document.createElement('canvas')
    srcCanvas.width  = image.data.width
    srcCanvas.height = image.data.height
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(image.data, 0, 0)
    const imageData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height)

    setImagePaused(false)
    setLiveProgress(0)

    sorterRef.current?.stop()
    sorterRef.current = createImageSorter(
      imageData,
      outputCanvasRef.current,
      hDirection,
      vDirection,
      algorithm,
      frameCount,
      p => {
        setLiveProgress(p)
        if (sorterRef.current?.isPaused()) setImagePaused(true)
      },
    )

    return () => { sorterRef.current?.stop(); sorterRef.current = null }
  }, [image, liveActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keep settings in sync with sorter ───────────────────────────────────
  useEffect(() => { sorterRef.current?.setHDirection(hDirection)  }, [hDirection])
  useEffect(() => { sorterRef.current?.setVDirection(vDirection)  }, [vDirection])
  useEffect(() => { sorterRef.current?.setAlgorithm(algorithm)    }, [algorithm])
  useEffect(() => { sorterRef.current?.setFrameCount(frameCount)  }, [frameCount])

  // ── Apply pre-rendered frames when available ─────────────────────────────
  useEffect(() => {
    sorterRef.current?.setPreRendered(preRenderedFrames ?? null)
  }, [preRenderedFrames])

  // ── Sync post-effects to sorter ──────────────────────────────────────────
  useEffect(() => {
    sorterRef.current?.setPostEffects({ bwEnabled, overlayEnabled, overlayColor })
  }, [bwEnabled, overlayEnabled, overlayColor])

  const canvasStyle = bgColor ? { backgroundColor: bgColor } : undefined

  // ── Pause/resume around pre-rendering ───────────────────────────────────
  useEffect(() => {
    if (!sorterRef.current) return
    if (isPreRendering) {
      sorterRef.current.setPaused(true)
      setImagePaused(true)
    } else {
      sorterRef.current.setPaused(false)
      setImagePaused(false)
    }
  }, [isPreRendering])

  function previewVideoRef(el) {
    if (el && stream) el.srcObject = stream
  }

  async function openFeed() {
    setFeedError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      setStream(s)
      setFeedOpen(true)
    } catch {
      setFeedError('Camera access denied')
    }
  }

  function closeFeed() {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setFeedOpen(false)
    setFeedError(null)
  }

  function startFeed() {
    if (!stream) return
    const video = liveVideoRef.current
    video.srcObject = stream
    video.play()
    setFeedOpen(false)
    onLiveActive(true)
    setImagePaused(false)
    setLiveProgress(0)
    setTimeout(() => {
      sorterRef.current = createLiveSorter(
        liveVideoRef.current, outputCanvasRef.current,
        hDirection, vDirection, algorithm, frameCount,
        p => {
          setLiveProgress(p)
          if (sorterRef.current?.isPaused()) setImagePaused(true)
        },
      )
    }, 0)
  }

  function stopFeed() {
    sorterRef.current?.stop()
    sorterRef.current = null
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    onLiveActive(false)
    setImagePaused(false)
    setLiveProgress(0)
  }

  function handleFile(file) {
    const url = URL.createObjectURL(file)
    createImageBitmap(file).then(data => onImage({ url, data }))
  }

  function togglePause() {
    const next = !imagePaused
    setImagePaused(next)
    sorterRef.current?.setPaused(next)
  }

  function handleStop() {
    sorterRef.current?.setProgress(0)
    sorterRef.current?.setPaused(true)
    setLiveProgress(0)
    setImagePaused(true)
  }

  function toggleLoop() {
    const next = !isLooping
    setIsLooping(next)
    sorterRef.current?.setLoop(next)
  }

  function handleScrub(value) {
    const steps = Math.max(1, frameCount - 1)
    const p = value / steps
    sorterRef.current?.setProgress(p)
    setLiveProgress(p)
    if (!imagePaused) {
      sorterRef.current?.setPaused(true)
      setImagePaused(true)
    }
  }

  function scrubFromEvent(e) {
    const rect = scrubTrackRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    handleScrub(Math.round((x / rect.width) * Math.max(1, frameCount - 1)))
  }

  function onScrubPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    scrubFromEvent(e)
  }

  function onScrubPointerMove(e) {
    if (!isDraggingRef.current) return
    scrubFromEvent(e)
  }

  function onScrubPointerUp(e) {
    isDraggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const scrubBar = (
    <div
      className={styles.scrubBar}
      onPointerDown={onScrubPointerDown}
      onPointerMove={onScrubPointerMove}
      onPointerUp={onScrubPointerUp}
    >
      <div ref={scrubTrackRef} className={styles.scrubTrack}>
        <div className={styles.scrubFill} style={{ width: `${liveProgress * 100}%` }} />
        <div className={styles.scrubThumb} style={{ left: `${liveProgress * 100}%` }} />
      </div>
    </div>
  )

  // ── Prompt (no source loaded) ────────────────────────────────────────────
  if (!image && !liveActive) {
    return (
      <div className={styles.component}>
        <div className={styles.promptWrap}>
          <div className={styles.prompt}>
            <FileUpload
              label='Drop image here'
              accept={['image/*']}
              onFile={handleFile}
              layoutClassName={styles.uploadLayout}
            />
            <WebcamCapture onCapture={onImage} />
            <GhostButton
              label='Start live feed'
              icon={Video}
              color='white'
              onClick={openFeed}
              layoutClassName={styles.liveFeedButtonLayout}
            />
            {feedError && <span className={styles.error}>{feedError}</span>}
          </div>
        </div>

        <Modal isOpen={feedOpen} onClose={closeFeed} title='Live feed preview'>
          <div className={styles.feedModalContent}>
            <video autoPlay playsInline muted ref={previewVideoRef} className={styles.previewVideo} />
            <GhostButton
              label='Use live feed'
              icon={CircleDot}
              color='dynamic'
              onClick={startFeed}
              layoutClassName={styles.startButtonLayout}
            />
          </div>
        </Modal>

        <video ref={liveVideoRef} muted playsInline className={styles.hiddenVideo} />
      </div>
    )
  }

  // ── Live feed output ─────────────────────────────────────────────────────
  if (liveActive) {
    const liveFrameNum = Math.round(liveProgress * Math.max(1, frameCount - 1))

    return (
      <div className={styles.component}>
        <div className={styles.viewport}>
          <canvas ref={outputCanvasRef} className={styles.frame} style={canvasStyle} />
        </div>
        <div className={styles.controls}>
          {scrubBar}
          <div className={styles.toolbar}>
            <ActionIconButtonToggle
              icon={Repeat}
              isActive={isLooping}
              onChange={toggleLoop}
              title='Loop'
              style='transparent'
            />
            <ActionIconButton
              icon={Square}
              onClick={handleStop}
              title='Stop'
              style='transparent'
            />
            <ActionIconButton
              icon={imagePaused ? Play : Pause}
              onClick={togglePause}
              title={imagePaused ? 'Play' : 'Pause'}
              style='transparent'
            />
            <span className={styles.frameCounter}>
              {liveFrameNum + 1} / {frameCount}
            </span>
          </div>
        </div>
        <video ref={liveVideoRef} muted playsInline className={styles.hiddenVideo} />
      </div>
    )
  }

  // ── Image animation output ───────────────────────────────────────────────
  const currentFrameNum = Math.round(liveProgress * Math.max(1, frameCount - 1))
  const prerenderPct    = Math.round((preRenderProgress ?? 0) * 100)

  return (
    <div className={styles.component}>
      <div className={styles.viewport}>
        <canvas ref={outputCanvasRef} className={styles.frame} />
        {isPreRendering && (
          <div className={styles.prerenderOverlay}>
            <Loader size={28} />
            <span className={styles.prerenderLabel}>Pre-rendering…</span>
            <div className={styles.prerenderBar}>
              <div style={{ width: `${prerenderPct}%` }} className={styles.prerenderBarFill} />
            </div>
            <span style={{ opacity: 0.55 }} className={styles.prerenderLabel}>{prerenderPct}%</span>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        {scrubBar}
        <div className={styles.toolbar}>
          <ActionIconButtonToggle
            icon={Repeat}
            isActive={isLooping}
            onChange={toggleLoop}
            title='Loop'
            style='transparent'
          />
          <ActionIconButton
            icon={Square}
            onClick={handleStop}
            title='Stop'
            style='transparent'
          />
          <ActionIconButton
            icon={imagePaused ? Play : Pause}
            onClick={togglePause}
            title={imagePaused ? 'Play' : 'Pause'}
            style='transparent'
            disabled={isPreRendering}
          />
          <span className={styles.frameCounter}>
            {currentFrameNum + 1} / {frameCount}
          </span>
        </div>
      </div>
    </div>
  )
}
