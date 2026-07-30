/**
 * 后台嵌入模式。
 *
 * 后台「AI 功能 - AI 选品」用 iframe 直接嵌 `/chat?embed=1`。生产环境前台挂
 * `/`、后台挂 `/admin/`，同源，localStorage 天然共享，这里什么都不用做；开发
 * 环境两个应用在不同端口，所以由父窗口把令牌 postMessage 过来补一次交接。
 *
 * 安全约束：
 * - 只在真的被别人套在 iframe 里、且 URL 显式带 `embed=1` 时才接收消息。
 * - 只接受来自父窗口、且 origin 在白名单内的消息，其余一律丢弃。
 * - 只写 localStorage，不把令牌回发给任何人。
 */

const READY_MESSAGE = 'pim-embed-ready'
const SESSION_MESSAGE = 'pim-embed-session'

type SessionMessage = {
  type?: unknown
  token?: unknown
  refreshToken?: unknown
}

/** 当前是否处于后台嵌入模式。 */
export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false
  if (window.self === window.top) return false
  return new URLSearchParams(window.location.search).get('embed') === '1'
}

/**
 * 允许交接令牌的父窗口 origin。默认只信同源（生产），开发环境额外信
 * VITE_ADMIN_ORIGIN（默认后台 dev server 的 5173）。
 */
function allowedParentOrigins(): string[] {
  const origins = new Set<string>([window.location.origin])
  const configured = (import.meta.env.VITE_ADMIN_ORIGIN as string | undefined)?.trim()
  if (configured) origins.add(configured.replace(/\/+$/, ''))
  else if (import.meta.env.DEV) origins.add('http://localhost:5173')
  return [...origins]
}

/**
 * 嵌入模式下，向父窗口要一次登录态。
 *
 * 已经有令牌就直接返回（生产同源的常态）。否则等父窗口回发，超时就放弃 ——
 * 放弃后路由守卫会把 /chat 弹回门户首页要求登录，不做假成功。
 */
export function adoptParentSession(timeoutMs = 4000): Promise<void> {
  if (!isEmbedded()) return Promise.resolve()
  if (localStorage.getItem('token')) return Promise.resolve()

  const allowed = allowedParentOrigins()

  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.removeEventListener('message', onMessage)
      window.clearTimeout(timer)
      resolve()
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return
      if (!allowed.includes(event.origin)) return
      const data = event.data as SessionMessage | null
      if (!data || data.type !== SESSION_MESSAGE) return
      if (typeof data.token === 'string' && data.token) {
        localStorage.setItem('token', data.token)
        if (typeof data.refreshToken === 'string' && data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken)
        }
      }
      finish()
    }

    const timer = window.setTimeout(finish, timeoutMs)
    window.addEventListener('message', onMessage)
    // 监听挂好之后才通知父窗口，避免它先发我们后听。
    window.parent.postMessage({ type: READY_MESSAGE }, '*')
  })
}

/**
 * 嵌入模式的页面收尾：
 * - 站内链接（例如产品详情跳后台）改为在父窗口打开，不在 iframe 里套娃。
 * - 打个 data 标记，样式上可以按需要收掉只属于独立页面的装饰。
 */
export function applyEmbedChrome(): void {
  if (!isEmbedded()) return
  document.documentElement.dataset.embed = '1'
  if (!document.head.querySelector('base[target]')) {
    const base = document.createElement('base')
    base.target = '_parent'
    document.head.appendChild(base)
  }
}
