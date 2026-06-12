import { Play, Pause, Repeat } from 'lucide-react'
import { Icon, Slider } from '@6njp/prototype-library'

import styles from './OutputPanel.module.css'

export function OutputPanel({
  frames,
  currentFrame,
  isPlaying,
  isLooping,
  isGenerating,
  generationProgress,
  onFrameChange,
  onTogglePlay,
  onToggleLoop,
}) {
  const hasFrames = frames.length > 0
  const frameUrl = frames[currentFrame]

  return (
    <div className={styles.component}>
      <div className={styles.viewport}>
        {frameUrl
          ? <img src={frameUrl} alt={`Frame ${currentFrame + 1}`} className={styles.frame} />
          : (
            <div className={styles.empty}>
              <span className={styles.emptyText}>
                {isGenerating ? 'Generating frames…' : 'No image loaded'}
              </span>
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

      {hasFrames && (
        <div className={styles.controls}>
          <div className={styles.playback}>
            <button
              type='button'
              onClick={onToggleLoop}
              aria-label='Toggle loop'
              className={cx(styles.iconButton, isLooping && styles.isActive)}
            >
              <Icon icon={Repeat} layoutClassName={styles.buttonIcon} />
            </button>

            <button
              type='button'
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className={styles.iconButton}
            >
              {isPlaying
                ? <Icon icon={Pause} layoutClassName={styles.buttonIcon} />
                : <Icon icon={Play} layoutClassName={styles.buttonIcon} />
              }
            </button>

            <span className={styles.frameCounter}>
              {currentFrame + 1} / {frames.length}
            </span>
          </div>

          <Slider
            value={currentFrame}
            onChange={onFrameChange}
            min={0}
            max={frames.length - 1}
            step={1}
            layoutClassName={styles.seekerLayout}
          />
        </div>
      )}
    </div>
  )
}
