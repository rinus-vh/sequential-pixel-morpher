import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button, Dropdown, LabelUppercaseSm } from '@6njp/prototype-library'

import { exportImageSequence, exportVideo } from '@/exportPipeline.js'

import styles from './ExportPanel.module.css'

const FORMAT_OPTIONS = [
  { value: 'sequence', label: 'Image sequence (.zip)' },
  { value: 'video',    label: 'Video (.webm / .mp4)'  },
]

const FPS_OPTIONS = [
  { value: '24', label: '24 fps' },
  { value: '30', label: '30 fps' },
]

export function ExportPanel({ image, hDirection, vDirection, algorithm, frameCount }) {
  const [format, setFormat] = useState('sequence')
  const [fps,    setFps]    = useState('30')
  const [isBusy, setIsBusy] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleExport() {
    if (!image || isBusy) return
    setIsBusy(true)
    setStatus('Generating…')
    try {
      if (format === 'sequence') {
        await exportImageSequence(
          image.data, hDirection, vDirection, algorithm, frameCount,
          p => setStatus(`${p}%`)
        )
      } else {
        setStatus('Recording…')
        await exportVideo(
          image.data, hDirection, vDirection, algorithm, frameCount, Number(fps),
          p => setStatus(`${p}%`)
        )
      }
      setStatus('Downloaded ✓')
    } catch (err) {
      setStatus(`Error: ${err.message}`)
    }
    setIsBusy(false)
  }

  return (
    <div className={styles.component}>
      <section className={styles.section}>
        <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Output format</LabelUppercaseSm>
        <Dropdown
          value={format}
          onChange={setFormat}
          options={FORMAT_OPTIONS}
        />
      </section>

      {format === 'video' && (
        <section className={styles.section}>
          <LabelUppercaseSm layoutClassName={styles.sectionLabel}>Frame rate</LabelUppercaseSm>
          <Dropdown
            value={fps}
            onChange={setFps}
            options={FPS_OPTIONS}
          />
        </section>
      )}

      {status && <span className={styles.status}>{status}</span>}

      <Button
        label={isBusy ? 'Exporting…' : 'Export'}
        icon={Download}
        onClick={handleExport}
        disabled={!image || isBusy}
        layoutClassName={styles.exportButton}
      />
    </div>
  )
}
