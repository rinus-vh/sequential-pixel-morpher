import { Dropdown, GhostButton, LabelUppercaseSm, Slider } from '@6njp/prototype-library'
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

// Deselectable toggle group: clicking the active option deselects it (value → null)
function ToggleGroup({ options, value, onChange }) {
  return (
    <div className={styles.toggleGroup}>
      {options.map(opt => (
        <button
          key={opt.value}
          type='button'
          className={`${styles.toggleOption} ${value === opt.value ? styles.toggleOptionActive : ''}`}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

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
        <ToggleGroup options={H_OPTIONS} value={hDirection} onChange={onHDirection} />
      </section>

      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Vertical direction</LabelUppercaseSm>
        <ToggleGroup options={V_OPTIONS} value={vDirection} onChange={onVDirection} />
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
            color='orange'
            onClick={onStopFeed}
            layoutClassName={styles.actionButton}
          />
        )}
        {image && (
          <GhostButton
            label='Discard image'
            icon={Trash2}
            color='orange'
            onClick={onDiscard}
            layoutClassName={styles.actionButton}
          />
        )}
      </div>
    </div>
  )
}
