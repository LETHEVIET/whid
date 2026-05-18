import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('build/icon.svg')

await sharp(svg).resize(24, 24, { fit: 'contain', kernel: 'lanczos3' }).png().toFile('build/tray-icon.png')
await sharp(svg).resize(64, 64, { fit: 'contain', kernel: 'lanczos3' }).png().toFile('build/window-icon.png')
await sharp(svg).resize(512, 512, { fit: 'contain', kernel: 'lanczos3' }).png().toFile('build/icon.png')
