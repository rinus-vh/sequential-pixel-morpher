import { Upload } from 'lucide-react'

import styles from './UploadZone.module.css'

export function UploadZone({ onImage }) {
  const inputRef = React.useRef(null)

  function handleFiles(files) {
    const file = files[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    createImageBitmap(file).then(data => onImage({ url, data }))
  }

  function onFileChange(e) {
    handleFiles(Array.from(e.target.files))
  }

  function onDrop(e) {
    e.preventDefault()
    e.currentTarget.classList.remove(styles.isDragOver)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  function onDragOver(e) {
    e.preventDefault()
    e.currentTarget.classList.add(styles.isDragOver)
  }

  function onDragLeave(e) {
    e.currentTarget.classList.remove(styles.isDragOver)
  }

  return (
    <button
      type='button'
      className={styles.component}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className={styles.input}
        onChange={onFileChange}
      />
      <Upload className={styles.icon} />
      <span className={styles.primary}>Drop image here</span>
      <span className={styles.secondary}>or click to select</span>
    </button>
  )
}
