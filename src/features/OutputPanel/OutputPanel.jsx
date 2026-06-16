import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Repeat, Square, Video, X, CircleDot } from 'lucide-react'
import { ActionIconButton, ActionIconButtonToggle, FileUpload, GhostButton, Slider } from '@6njp/prototype-library'

import { createLiveSorter } from '@/livePixelSorter.js'
import { WebcamCapture } from '@/features/WebcamCapture/WebcamCapture.jsx'

import styles from './OutputPanel.module.css'

export function OutputPanel({
  frames,
  currentFrame,
  isPlaying,
  isLooping,
  isGenerating,
  generationProgress,
  image,
  direction,
  frameCount,
  onFrameChange,
  onTogglePlay,
  onStop,
  onToggleLoop,
  onImage,
}) {
  const hasFrames = frames.length > 0
  const frameUrl = frames[currentFrame]

  // ── Live feed state ──────────────────────────────────────────────────────
  const [feedOpen,  setFeedOpen]  = useState(false)
  const [stream,    setStream]    = useState(null)
  const [feedError, setFeedError] = useState(null)
  const [liveActive, setLiveActive] = useState(false)

  const previewVideoRef = useRef(null)  // camera preview in modal
  const liveVideoRef    = useRef(null)  // hidden video element driving the sorter
  const outputCanvasRef = useRef(null)  // canvas showing sorted output
  const sorterRef       = useRef(null)  // live sorter handle

  // Keep direction and frameCount in sync with live sorter without restarting it
  useEffect(() => { sorterRef.current?.setDirection(direction) },   [direction])
  useEffect(() => { sorterRef.current?.setFrameCount(frameCount) }, [frameCount])

  // Wire preview video to stream when modal opens
  useEffect(() => {
    if (previewVideoRef.current && stream) previewVideoRef.current.srcObject = stream
  }, [stream, feedOpen])

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
    // Attach stream to hidden video element
    const video = liveVideoRef.current
    video.srcObject = stream
    video.play()
    setFeedOpen(false)
    setLiveActive(true)
    // Start sorter after a tick so canvas is mounted
    setTimeout(() => {
      sorterRef.current = createLiveSorter(liveVideoRef.current, outputCanvasRef.current, direction, frameCount)
    }, 0)
  }

  function stopFeed() {
    sorterRef.current?.stop()
    sorterRef.current = null
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setLiveActive(false)
  }

  function handleFile(file) {
    const url = URL.createObjectURL(file)
    createImageBitmap(file).then(data => onImage({ url, data }))
  }

  // ── Prompt (no source loaded) ────────────────────────────────────────────
  if (!image && !liveActive && !isGenerating && !hasFrames) {
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

        {feedOpen && (
          <div className={styles.overlay}>
            <div className={styles.dialog}>
              <div className={styles.dialogHeader}>
                <span className={styles.dialogTitle}>Live feed preview</span>
                <button type='button' onClick={closeFeed} className={styles.closeButton}>
                  <X size={16} />
                </button>
              </div>
              <video autoPlay playsInline muted ref={previewVideoRef} className={styles.previewVideo} />
              <div className={styles.dialogFooter}>
                <button type='button' onClick={startFeed} className={styles.startButton}>
                  <CircleDot size={15} />
                  <span>Use live feed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden video element for the sorter */}
        <video ref={liveVideoRef} muted playsInline className={styles.hiddenVideo} />
      </div>
    )
  }

  // ── Live feed output ─────────────────────────────────────────────────────
  if (liveActive) {
    return (
      <div className={styles.component}>
        <div className={styles.viewport}>
          <canvas ref={outputCanvasRef} className={styles.frame} />
        </div>
        <div className={styles.controls}>
          <div className={styles.toolbar}>
            <GhostButton
              label='Stop live feed'
              icon={X}
              color='orange'
              onClick={stopFeed}
              layoutClassName={styles.stopLiveLayout}
            />
          </div>
        </div>
        {/* Hidden video for the sorter */}
        <video ref={liveVideoRef} muted playsInline className={styles.hiddenVideo} />
      </div>
    )
  }

  // ── Static image / frames output ─────────────────────────────────────────
  return (
    <div className={styles.component}>
      <div className={styles.viewport}>
        {frameUrl
          ? <img src={frameUrl} alt={`Frame ${currentFrame + 1}`} className={styles.frame} />
          : <img src={image.url} alt='Input' className={styles.frame} />
        }

        {isGenerating && (
          <div className={styles.progressOverlay}>
            <div className={styles.progressBar}>
              <div style={{ width: `${generationProgress}%` }} className={styles.progressFill} />
            </div>
            <span className={styles.progressLabel}>{generationProgress}%</span>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.toolbar}>
          <ActionIconButtonToggle
            icon={Repeat}
            isActive={isLooping}
            onChange={onToggleLoop}
            title='Loop'
            style='transparent'
          />
          <ActionIconButton
            icon={Square}
            onClick={onStop}
            title='Stop'
            style='transparent'
            disabled={!hasFrames}
          />
          <ActionIconButton
            icon={isPlaying ? Pause : Play}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            style='transparent'
            disabled={!hasFrames}
          />
          {hasFrames && (
            <span className={styles.frameCounter}>
              {currentFrame + 1} / {frames.length}
            </span>
          )}
        </div>

        {hasFrames && (
          <Slider
            value={currentFrame}
            onChange={onFrameChange}
            min={0}
            max={frames.length - 1}
            step={1}
            layoutClassName={styles.seekerLayout}
          />
        )}
      </div>
    </div>
  )
}
