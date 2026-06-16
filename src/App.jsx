import { Diameter } from 'lucide-react'
import { Grid, Header, Panel } from '@6njp/prototype-library'
import { getThemeVariables, ThemeContextProvider } from '@6njp/prototype-library/machinery'

import { SettingsPanel } from '@/features/SettingsPanel/SettingsPanel.jsx'
import { OutputPanel }   from '@/features/OutputPanel/OutputPanel.jsx'
import { ExportPanel }   from '@/features/ExportPanel/ExportPanel.jsx'
import { preRenderAllFrames } from '@/livePixelSorter.js'

import styles from './App.module.css'

export default function App() {
  const [isDark, setIsDark] = React.useState(true)

  const [image,      setImage]      = React.useState(null)
  const [algorithm,  setAlgorithm]  = React.useState('swap')
  const [hDirection, setHDirection] = React.useState('left-to-right')
  const [vDirection, setVDirection] = React.useState(null)
  const [frameCount, setFrameCount] = React.useState(60)

  const [exportOpen, setExportOpen] = React.useState(false)
  const [liveActive, setLiveActive] = React.useState(false)

  const stopFeedRef = React.useRef(null)

  // ── Pre-render ─────────────────────────────────────────────────────────
  const [preRendered,       setPreRendered]       = React.useState(null)
  const [isPreRendering,    setIsPreRendering]    = React.useState(false)
  const [preRenderProgress, setPreRenderProgress] = React.useState(0)

  const preRenderKey = JSON.stringify({ hDirection, vDirection, algorithm, frameCount, url: image?.url })
  const needsPreRender = !!image && (!preRendered || preRendered.settingsKey !== preRenderKey)

  async function handlePreRender() {
    if (!image || isPreRendering) return
    setIsPreRendering(true)
    setPreRenderProgress(0)

    const srcCanvas = document.createElement('canvas')
    srcCanvas.width  = image.data.width
    srcCanvas.height = image.data.height
    const ctx = srcCanvas.getContext('2d')
    ctx.drawImage(image.data, 0, 0)
    const imageData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height)

    const bitmaps = await preRenderAllFrames(
      imageData, hDirection, vDirection, algorithm, frameCount,
      p => setPreRenderProgress(p),
    )

    setPreRendered({ bitmaps, settingsKey: preRenderKey })
    setIsPreRendering(false)
    setPreRenderProgress(0)
  }

  // When settings change the cached pre-render becomes stale — clear it so
  // the sorter falls back to live rendering until the user pre-renders again.
  React.useEffect(() => {
    if (preRendered && preRendered.settingsKey !== preRenderKey) {
      setPreRendered(null)
    }
  }, [preRenderKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Download current frame ─────────────────────────────────────────────
  const downloadFnRef = React.useRef(null)

  function handleDownloadFrame() {
    downloadFnRef.current?.()
  }

  function handleDiscard() {
    setImage(null)
    setPreRendered(null)
  }

  const theme = isDark ? 'dark' : 'light'

  return (
    <ThemeContextProvider {...{ theme }}>
    <main style={getThemeVariables(theme)} className={styles.app}>
      <Header
        title='Sequential Pixel Sorter'
        logo={Diameter}
        onToggleTheme={() => setIsDark(d => !d)}
        layoutClassName={styles.headerLayout}
        {...{ isDark }}
      />

      <Grid layoutClassName={styles.gridLayout}>
        <Panel title='Settings' minWidth={4} minHeight={9}>
          <SettingsPanel
            onAlgorithm={setAlgorithm}
            onHDirection={setHDirection}
            onVDirection={setVDirection}
            onFrameCount={setFrameCount}
            onOpenExport={() => setExportOpen(true)}
            onDownloadFrame={handleDownloadFrame}
            onPreRender={handlePreRender}
            onDiscard={handleDiscard}
            onStopFeed={() => stopFeedRef.current?.()}
            {...{ image, algorithm, hDirection, vDirection, frameCount, needsPreRender, isPreRendering, liveActive }}
          />
        </Panel>

        {exportOpen && (
          <Panel
            title='Export'
            minWidth={4}
            minHeight={4}
            isCloseable
            onClose={() => setExportOpen(false)}
          >
            <ExportPanel
              {...{ image, hDirection, vDirection, algorithm, frameCount }}
            />
          </Panel>
        )}

        <Panel title='Output' minWidth={8} minHeight={9}>
          <OutputPanel
            onImage={img => { setImage(img); setPreRendered(null) }}
            onRegisterDownload={fn => { downloadFnRef.current = fn }}
            onRegisterStopFeed={fn => { stopFeedRef.current = fn }}
            onLiveActive={setLiveActive}
            preRenderedFrames={preRendered?.bitmaps ?? null}
            {...{ image, algorithm, hDirection, vDirection, frameCount, isPreRendering, preRenderProgress, liveActive }}
          />
        </Panel>
      </Grid>
    </main>
    </ThemeContextProvider>
  )
}
