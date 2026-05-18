import { useState, useEffect } from 'react'
import { Monitor, Eye, Volume2, VolumeX, FolderOpen, ExternalLink } from 'lucide-react'
import { Switch } from '@base-ui/react/switch'
import { Button } from '@base-ui/react/button'
import { setSoundEnabled } from '../utils/sounds'

const SETTINGS_KEY = 'whid_settings'

interface SettingsState {
  alwaysOnTop: boolean
  autoHideOnBlur: boolean
  soundEnabled: boolean
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { alwaysOnTop: true, autoHideOnBlur: true, soundEnabled: true }
}

function saveSettings(s: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsState>(loadSettings)
  const [dbDir, setDbDir] = useState('')
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    saveSettings(settings)
    window.api.setAlwaysOnTop(settings.alwaysOnTop)
    window.api.setAutoHideOnBlur(settings.autoHideOnBlur)
    setSoundEnabled(settings.soundEnabled)
  }, [settings])

  useEffect(() => {
    window.api.getDbPath().then(info => setDbDir(info.dir))
  }, [])

  const toggle = (key: keyof SettingsState) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleMoveData = async () => {
    const selected = await window.api.selectDbPath()
    if (!selected) return
    setMoving(true)
    const result = await window.api.setDbPath(selected)
    if (result) setDbDir(result.dir)
    setMoving(false)
  }

  return (
    <div className="settings">
      <div className="settings-list">
        <div className="settings-item">
          <div className="settings-item-left">
            <Monitor size={16} />
            <div className="settings-item-info">
              <span className="settings-item-label">Always on Top</span>
              <span className="settings-item-desc">Keep the window above other apps</span>
            </div>
          </div>
          <Switch.Root
            className="toggle"
            checked={settings.alwaysOnTop}
            onCheckedChange={() => toggle('alwaysOnTop')}
          >
            <Switch.Thumb className="toggle-knob" />
          </Switch.Root>
        </div>

        <div className="settings-item">
          <div className="settings-item-left">
            <Eye size={16} />
            <div className="settings-item-info">
              <span className="settings-item-label">Auto-hide on Blur</span>
              <span className="settings-item-desc">Hide window when it loses focus</span>
            </div>
          </div>
          <Switch.Root
            className="toggle"
            checked={settings.autoHideOnBlur}
            onCheckedChange={() => toggle('autoHideOnBlur')}
          >
            <Switch.Thumb className="toggle-knob" />
          </Switch.Root>
        </div>

        <div className="settings-item">
          <div className="settings-item-left">
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <div className="settings-item-info">
              <span className="settings-item-label">Sound Effects</span>
              <span className="settings-item-desc">Play sounds when logging or deleting entries</span>
            </div>
          </div>
          <Switch.Root
            className="toggle"
            checked={settings.soundEnabled}
            onCheckedChange={() => toggle('soundEnabled')}
          >
            <Switch.Thumb className="toggle-knob" />
          </Switch.Root>
        </div>
      </div>

      <div className="settings-section">
        <span className="settings-section-title">Data Storage</span>
        <div className="settings-storage">
          <div className="settings-storage-info">
            <FolderOpen size={14} />
            <span className="settings-storage-path" title={dbDir}>{dbDir || 'Loading...'}</span>
          </div>
          <Button className="btn-small" onClick={handleMoveData} disabled={moving}>
            {moving ? 'Moving...' : <><ExternalLink size={12} /> Move Data</>}
          </Button>
        </div>
      </div>

      <div className="settings-about">
        <span className="settings-about-label">Keyboard shortcut</span>
        <span className="settings-about-value"><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd></span>
      </div>
    </div>
  )
}
