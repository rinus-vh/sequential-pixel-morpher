import { Play, Pause, Repeat, Square } from 'lucide-react'
import { ActionIconButton, ActionIconButtonToggle, FileUpload, Slider } from '@6njp/prototype-library'

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
  onFrameChange,
  onTogglePlay,
  onStop,
  onToggleLoop,
  onImage,
}) {
  const hasFrames = frames.length > 0
  const frameUrl = frames[currentFrame]

  function handleFile(file) {
    const url = URL.createObjectURL(file)
    createImageBitmap(file).then(data => onImage({ url, data }))
  }

  return (
    <div className={styles.component}>
      <div className={styles.viewport}>
        {frameUrl
          ? <img src={frameUrl} alt={`Frame ${currentFrame + 1}`} className={styles.frame} />
          : image
            ? <img src={image.url} alt='Input' className={styles.frame} />
            : (
              <div className={styles.uploadZone}>
                <FileUpload
                  label='Drop image here'
                  accept={['image/*']}
                  onFile={handleFile}
                />
                <WebcamCapture onCapture={onImage} />
              </div>
            )
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
