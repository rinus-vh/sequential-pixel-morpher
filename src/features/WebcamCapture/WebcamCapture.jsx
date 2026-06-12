import { Button, Icon } from '@6njp/prototype-library'
import { Camera, X, CircleDot } from 'lucide-react'

import styles from './WebcamCapture.module.css'

export function WebcamCapture({ onCapture }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [stream, setStream] = React.useState(null)
  const [error, setError] = React.useState(null)
  const videoRef = React.useRef(null)

  async function open() {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(s)
      setIsOpen(true)
    } catch {
      setError('Camera access denied')
    }
  }

  function close() {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setIsOpen(false)
    setError(null)
  }

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream, isOpen])

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      createImageBitmap(blob).then(data => {
        onCapture({ url, data })
        close()
      })
    }, 'image/jpeg', 0.95)
  }

  return (
    <>
      <button type='button' className={styles.trigger} onClick={open}>
        <Icon icon={Camera} layoutClassName={styles.triggerIcon} />
        <span>Take a photo</span>
      </button>

      {error && <p className={styles.error}>{error}</p>}

      {isOpen && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <span className={styles.dialogTitle}>Webcam</span>
              <button type='button' className={styles.closeButton} onClick={close}>
                <Icon icon={X} layoutClassName={styles.closeIcon} />
              </button>
            </div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={styles.video}
            />
            <div className={styles.dialogFooter}>
              <Button label='Capture' icon={CircleDot} onClick={capture} layoutClassName={styles.captureButton} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
