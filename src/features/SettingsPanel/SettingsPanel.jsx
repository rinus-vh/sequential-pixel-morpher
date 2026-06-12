import { Button, FileUpload, RadioGroup, Slider, LabelUppercaseSm } from '@6njp/prototype-library'
import { Zap, Trash2, Download } from 'lucide-react'

import { WebcamCapture } from '@/features/WebcamCapture/WebcamCapture.jsx'

import styles from './SettingsPanel.module.css'

const DIRECTION_OPTIONS = [
  { value: 'left-to-right', label: '→ Left to Right' },
  { value: 'right-to-left', label: '← Right to Left' },
  { value: 'top-to-bottom', label: '↓ Top to Bottom' },
  { value: 'bottom-to-top', label: '↑ Bottom to Top' },
]

export function SettingsPanel({
  image,
  direction,
  frameCount,
  isGenerating,
  hasFrames,
  onImage,
  onDirection,
  onFrameCount,
  onGenerate,
  onDiscard,
  onDownload,
}) {
  function handleFile(file) {
    const url = URL.createObjectURL(file)
    createImageBitmap(file).then(data => onImage({ url, data }))
  }

  return (
    <div className={styles.component}>
      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Image</LabelUppercaseSm>
        {image
          ? (
            <div className={styles.imagePreview}>
              <img src={image.url} alt='Input' className={styles.thumb} />
              <span className={styles.imageDims}>{image.data.width} × {image.data.height}px</span>
            </div>
          )
          : (
            <div className={styles.uploadGroup}>
              <FileUpload
                label='Drop image here'
                accept={['image/*']}
                onFile={handleFile}
              />
              <WebcamCapture onCapture={onImage} />
            </div>
          )
        }
      </section>

      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Sort Direction</LabelUppercaseSm>
        <RadioGroup
          name='direction'
          value={direction}
          onChange={onDirection}
          options={DIRECTION_OPTIONS}
        />
      </section>

      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Frame Count</LabelUppercaseSm>
        <Slider
          label={`${frameCount} frames`}
          value={frameCount}
          onChange={onFrameCount}
          min={10}
          max={120}
          step={5}
        />
      </section>

      <div className={styles.actions}>
        {hasFrames && (
          <Button
            label='Download'
            icon={Download}
            variant='outline'
            onClick={onDownload}
            layoutClassName={styles.actionButton}
          />
        )}
        {image && (
          <Button
            label='Discard'
            icon={Trash2}
            variant='outline'
            onClick={onDiscard}
            layoutClassName={styles.actionButton}
          />
        )}
        <Button
          label={isGenerating ? 'Generating…' : 'Generate'}
          icon={Zap}
          onClick={onGenerate}
          layoutClassName={styles.generateButton}
        />
      </div>
    </div>
  )
}
