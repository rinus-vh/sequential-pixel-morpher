import { CheckboxBar, GhostButton, LabelUppercaseSm, Slider } from '@6njp/prototype-library'
import { Trash2, Download, Zap } from 'lucide-react'

import { Button } from '@6njp/prototype-library'

import styles from './SettingsPanel.module.css'

const DIRECTION_OPTIONS = [
  { value: 'left-to-right', label: '→ Left to Right' },
  { value: 'right-to-left', label: '← Right to Left' },
  { value: 'top-to-bottom', label: '↓ Top to Bottom' },
  { value: 'bottom-to-top', label: '↑ Bottom to Top' },
]

export function SettingsPanel({
  direction,
  frameCount,
  isGenerating,
  hasFrames,
  image,
  onDirection,
  onFrameCount,
  onGenerate,
  onDiscard,
  onDownload,
}) {
  return (
    <div className={styles.component}>
      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Sort Direction</LabelUppercaseSm>
        <CheckboxBar
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={onDirection}
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
        <Button
          label={isGenerating ? 'Generating…' : 'Generate'}
          icon={Zap}
          onClick={onGenerate}
          layoutClassName={styles.generateButton}
        />
        {image && (
          <GhostButton
            label='Discard image'
            icon={Trash2}
            color='orange'
            onClick={onDiscard}
            layoutClassName={styles.discardButton}
          />
        )}
      </div>
    </div>
  )
}
