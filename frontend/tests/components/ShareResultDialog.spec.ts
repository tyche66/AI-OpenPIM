import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import ShareResultDialog from '@/components/ShareResultDialog.vue'

const __dirname = dirname(fileURLToPath(import.meta.url))
const shareResultSource = readFileSync(
  resolve(__dirname, '../../src/components/ShareResultDialog.vue'),
  'utf-8',
)

describe('ShareResultDialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('contains share URL input in template', () => {
    expect(ShareResultDialog.__file).toContain('ShareResultDialog.vue')
  })

  it('template contains share-url-input class', () => {
    expect(shareResultSource).toContain('share-url-input')
    expect(shareResultSource).toContain('shareUrl')
    expect(shareResultSource).toContain('复制')
    expect(shareResultSource).toContain('下载二维码')
    expect(shareResultSource).toContain('在新窗口预览')
    expect(shareResultSource).toContain('qr-canvas')
    expect(shareResultSource).toContain('qrcode')
    expect(shareResultSource).toContain('VITE_PUBLIC_FRONTEND_URL')
    expect(shareResultSource).toContain('navigator.clipboard')
    expect(shareResultSource).toContain('window.open')
  })

  it('template contains QR code generation', () => {
    expect(shareResultSource).toContain('toCanvas')
    expect(shareResultSource).toContain('qrcode')
  })

  it('template contains absolute URL resolution logic', () => {
    expect(shareResultSource).toContain('VITE_PUBLIC_FRONTEND_URL')
    expect(shareResultSource).toContain('window.location.origin')
  })
})
