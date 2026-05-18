import { useState, useEffect, useRef } from 'react'
import { Monitor, Eye, Moon, Sun, Volume2, VolumeX, FolderOpen, ExternalLink, RefreshCw, Download, RotateCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Switch } from '@base-ui/react/switch'
import { Button } from '@base-ui/react/button'
import { setSoundEnabled } from '../utils/sounds'

const SETTINGS_KEY = 'whid_settings'

function isDark(theme: 'light' | 'dark' | 'system'): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyThemeClass(theme: 'light' | 'dark' | 'system') {
  document.documentElement.classList.toggle('dark', isDark(theme))
}

type Theme = 'light' | 'dark' | 'system'

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system']
const THEME_ICON: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor }
const THEME_LABEL: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' }

interface SettingsState {
  alwaysOnTop: boolean
  autoHideOnBlur: boolean
  soundEnabled: boolean
  theme: Theme
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const theme: Theme = parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system'
      return {
        alwaysOnTop: parsed.alwaysOnTop !== false,
        autoHideOnBlur: parsed.autoHideOnBlur !== false,
        soundEnabled: parsed.soundEnabled !== false,
        theme
      }
    }
  } catch { /* ignore */ }
  return { alwaysOnTop: true, autoHideOnBlur: true, soundEnabled: true, theme: 'system' }
}

function saveSettings(s: SettingsState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

interface SettingsProps {
  updateStatus: UpdateStatus
  onCheckForUpdates: () => void
  onDownloadUpdate: () => void
  onInstallUpdate: () => void
}

export function Settings({ updateStatus, onCheckForUpdates, onDownloadUpdate, onInstallUpdate }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>(loadSettings)
  const [dbDir, setDbDir] = useState('')
  const [moving, setMoving] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const mqRef = useRef<MediaQueryList | null>(null)

  useEffect(() => {
    saveSettings(settings)
    window.api.setAlwaysOnTop(settings.alwaysOnTop)
    window.api.setAutoHideOnBlur(settings.autoHideOnBlur)
    setSoundEnabled(settings.soundEnabled)
  }, [settings])

  useEffect(() => {
    window.api.getDbPath().then(info => setDbDir(info.dir))
    window.api.getAppVersion().then(setAppVersion)
  }, [])

  useEffect(() => {
    if (mqRef.current) {
      mqRef.current.removeEventListener('change', handleSystemChange)
    }
    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mqRef.current = mq
      mq.addEventListener('change', handleSystemChange)
    }
    return () => {
      if (mqRef.current) {
        mqRef.current.removeEventListener('change', handleSystemChange)
      }
    }
  }, [settings.theme])

  const handleSystemChange = () => applyThemeClass('system')

  const toggle = (key: 'alwaysOnTop' | 'autoHideOnBlur' | 'soundEnabled') => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(settings.theme) + 1) % THEME_CYCLE.length]
    applyThemeClass(next)
    setSettings(prev => ({ ...prev, theme: next }))
  }

  const handleMoveData = async () => {
    const selected = await window.api.selectDbPath()
    if (!selected) return
    setMoving(true)
    const result = await window.api.setDbPath(selected)
    if (result) setDbDir(result.dir)
    setMoving(false)
  }

  const renderUpdateAction = () => {
    switch (updateStatus.type) {
      case 'idle':
        return (
          <Button className="btn-small" onClick={onCheckForUpdates}>
            <RefreshCw size={12} /> Check for Updates
          </Button>
        )
      case 'checking':
        return (
          <div className="update-status">
            <span className="update-status-spinner" />
            <span>Checking for updates...</span>
          </div>
        )
      case 'available':
        return (
          <div className="update-status">
            <AlertCircle size={14} className="update-icon-available" />
            <span>v{updateStatus.version} available</span>
            <Button className="btn-small" onClick={onDownloadUpdate}>
              <Download size={12} /> Download
            </Button>
          </div>
        )
      case 'not-available':
        return (
          <div className="update-status">
            <CheckCircle2 size={14} className="update-icon-current" />
            <span>You're up to date</span>
          </div>
        )
      case 'downloading':
        return (
          <div className="update-status">
            <span className="update-status-spinner" />
            <span>Downloading... {Math.round(updateStatus.percent)}%</span>
          </div>
        )
      case 'downloaded':
        return (
          <div className="update-status">
            <CheckCircle2 size={14} className="update-icon-available" />
            <span>v{updateStatus.version} ready to install</span>
            <Button className="btn-small" onClick={onInstallUpdate}>
              <RotateCw size={12} /> Restart & Update
            </Button>
          </div>
        )
      case 'error':
        return (
          <div className="update-status">
            <AlertCircle size={14} className="update-icon-error" />
            <span className="update-error-text">{updateStatus.message}</span>
            <Button className="btn-small" onClick={onCheckForUpdates}>
              <RefreshCw size={12} /> Retry
            </Button>
          </div>
        )
    }
  }

  const ThemeIcon = THEME_ICON[settings.theme]

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

        <div className="settings-item">
          <div className="settings-item-left">
            <ThemeIcon size={16} />
            <div className="settings-item-info">
              <span className="settings-item-label">Theme</span>
              <span className="settings-item-desc">
                {settings.theme === 'system' ? 'Follows your system appearance' : `Always ${settings.theme}`}
              </span>
            </div>
          </div>
          <button className="theme-toggle" onClick={cycleTheme} title={`Switch to ${THEME_CYCLE[(THEME_CYCLE.indexOf(settings.theme) + 1) % THEME_CYCLE.length]}`}>
            <ThemeIcon size={14} />
            <span>{THEME_LABEL[settings.theme]}</span>
          </button>
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

      <div className="settings-section">
        <span className="settings-section-title">Updates</span>
        <div className="settings-update-row">
          <span className="settings-update-version">v{appVersion || '...'}</span>
          {renderUpdateAction()}
        </div>
      </div>

      <div className="settings-about">
        <span className="settings-about-label">Keyboard shortcut</span>
        <span className="settings-about-value"><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>L</kbd></span>
      </div>
    </div>
  )
}
