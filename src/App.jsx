import JSZip from 'jszip'

import { Grid, Header, Panel } from '@6njp/prototype-library'
import { getThemeVariables } from '@6njp/prototype-library/machinery'

import { generateMorphFrames } from '@/pixelSorter.js'
import { SettingsPanel } from '@/features/SettingsPanel/SettingsPanel.jsx'
import { OutputPanel } from '@/features/OutputPanel/OutputPanel.jsx'

import styles from './App.module.css'

export default function App() {
  const [isDark, setIsDark] = React.useState(true)
  const themeVariables = getThemeVariables(isDark ? 'dark' : 'light')

  const [image, setImage] = React.useState(null)
  const [direction, setDirection] = React.useState('left-to-right')
  const [frameCount, setFrameCount] = React.useState(60)

  const [frames, setFrames] = React.useState([])
  const [currentFrame, setCurrentFrame] = React.useState(0)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generationProgress, setGenerationProgress] = React.useState(0)

  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isLooping, setIsLooping] = React.useState(true)
  const [playDir, setPlayDir] = React.useState(1)

  const playRef = React.useRef(null)

  React.useEffect(() => {
    if (!isPlaying || frames.length === 0) {
      clearInterval(playRef.current)
      return
    }
    playRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + playDir
        if (next >= frames.length) {
          if (isLooping) { setPlayDir(-1); return frames.length - 2 }
          setIsPlaying(false); return prev
        }
        if (next < 0) {
          if (isLooping) { setPlayDir(1); return 1 }
          setIsPlaying(false); return prev
        }
        return next
      })
    }, 50)
    return () => clearInterval(playRef.current)
  }, [isPlaying, frames.length, playDir, isLooping])

  async function handleGenerate() {
    if (!image || isGenerating) return
    setIsGenerating(true)
    setGenerationProgress(0)
    setFrames([])
    setCurrentFrame(0)
    setIsPlaying(false)

    const collected = []
    await generateMorphFrames(
      image.data,
      direction,
      frameCount,
      pct => setGenerationProgress(pct),
      (dataUrl, idx) => {
        collected.push(dataUrl)
        setFrames([...collected])
        if (idx === 0) setCurrentFrame(0)
      }
    )

    setIsGenerating(false)
    setCurrentFrame(0)
    setIsPlaying(true)
  }

  async function handleDownload() {
    if (frames.length === 0) return
    const zip = new JSZip()
    frames.forEach((f, i) => {
      const b64 = f.split(',')[1]
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      zip.file(`frame-${String(i).padStart(4, '0')}.jpg`, bytes)
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pixel-morph.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDiscard() {
    setImage(null)
    setFrames([])
    setCurrentFrame(0)
    setIsPlaying(false)
    setGenerationProgress(0)
  }

  function handleFrameChange(v) {
    setIsPlaying(false)
    setCurrentFrame(v)
  }

  return (
    <main style={themeVariables} className={styles.app}>
      <Header onToggleTheme={() => setIsDark(d => !d)} layoutClassName={styles.headerLayout} isDark={isDark} navItems={[]} />

      <Grid layoutClassName={styles.gridLayout}>
        <Panel title='Settings' minWidth={7} minHeight={10}>
          <SettingsPanel
            image={image}
            direction={direction}
            frameCount={frameCount}
            isGenerating={isGenerating}
            hasFrames={frames.length > 0}
            onImage={setImage}
            onDirection={setDirection}
            onFrameCount={setFrameCount}
            onGenerate={handleGenerate}
            onDiscard={handleDiscard}
            onDownload={handleDownload}
          />
        </Panel>

        <Panel title='Output' minWidth={10} minHeight={10}>
          <OutputPanel
            frames={frames}
            currentFrame={currentFrame}
            isPlaying={isPlaying}
            isLooping={isLooping}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            onFrameChange={handleFrameChange}
            onTogglePlay={() => {
      if (!isPlaying) {
        // Starting playback: always go forward, wrap to start if at the end
        setPlayDir(1)
        if (currentFrame >= frames.length - 1) setCurrentFrame(0)
      }
      setIsPlaying(p => !p)
    }}
            onToggleLoop={() => setIsLooping(l => !l)}
          />
        </Panel>
      </Grid>
    </main>
  )
}
