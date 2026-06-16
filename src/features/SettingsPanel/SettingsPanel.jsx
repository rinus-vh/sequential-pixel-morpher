import { CheckboxBarRadio, Dropdown, GhostButton, LabelUppercaseSm, Slider } from '@6njp/prototype-library'
import { Download, Image, Layers, Trash2, Video } from 'lucide-react'

import styles from './SettingsPanel.module.css'

const ALGORITHM_OPTIONS = [
  { value: 'swap',               label: 'Swap light and dark pixels' },
  { value: 'sort-light-to-dark', label: 'Sort from light to dark'   },
]

const H_OPTIONS = [
  { value: 'left-to-right', label: '→ Left to Right' },
  { value: 'right-to-left', label: '← Right to Left' },
]

const V_OPTIONS = [
  { value: 'top-to-bottom', label: '↓ Top to Bottom' },
  { value: 'bottom-to-top', label: '↑ Bottom to Top' },
]


export function SettingsPanel({
  algorithm,
  hDirection,
  vDirection,
  frameCount,
  image,
  liveActive,
  needsPreRender,
  isPreRendering,
  onAlgorithm,
  onHDirection,
  onVDirection,
  onFrameCount,
  onOpenExport,
  onDownloadFrame,
  onPreRender,
  onDiscard,
  onStopFeed,
}) {
  return (
    <div className={styles.component}>
      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Algorithm</LabelUppercaseSm>
        <Dropdown
          value={algorithm}
          onChange={onAlgorithm}
          options={ALGORITHM_OPTIONS}
        />
      </section>

      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Horizontal direction</LabelUppercaseSm>
        <CheckboxBarRadio options={H_OPTIONS} value={hDirection} onChange={v => onHDirection(v === hDirection ? null : v)} />
      </section>

      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Vertical direction</LabelUppercaseSm>
        <CheckboxBarRadio options={V_OPTIONS} value={vDirection} onChange={v => onVDirection(v === vDirection ? null : v)} />
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
        {image && needsPreRender && (
          <GhostButton
            label={isPreRendering ? 'Pre-rendering…' : 'Pre render'}
            icon={Layers}
            color='white'
            onClick={onPreRender}
            disabled={isPreRendering}
            layoutClassName={styles.actionButton}
          />
        )}
        {(image || liveActive) && (
          <GhostButton
            label='Download current frame'
            icon={Image}
            color='white'
            onClick={onDownloadFrame}
            layoutClassName={styles.actionButton}
          />
        )}
        <GhostButton
          label='Export settings'
          icon={Download}
          color='white'
          onClick={onOpenExport}
          layoutClassName={styles.actionButton}
        />
        {liveActive && (
          <GhostButton
            label='Stop live feed'
            icon={Video}
            color='dynamic'
            onClick={onStopFeed}
            layoutClassName={styles.actionButton}
          />
        )}
        {image && (
          <GhostButton
            label='Discard image'
            icon={Trash2}
            color='dynamic'
            onClick={onDiscard}
            layoutClassName={styles.actionButton}
          />
        )}
      </div>
    </div>
  )
}
