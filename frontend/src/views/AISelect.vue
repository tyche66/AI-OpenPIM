<template>
  <section class="ai-portal">
    <header class="portal-bar">
      <div class="portal-copy">
        <span class="portal-kicker">AI 选品</span>
        <p>
          与前台一致的查询工作台：问型号、问资料、查质量、做比较，返回答案、候选产品和引用来源。
        </p>
      </div>
      <div class="portal-tools">
        <el-button
          class="portal-btn"
          @click="reload"
        >
          重新加载
        </el-button>
        <el-button
          class="portal-btn"
          @click="openStandalone"
        >
          新窗口打开
        </el-button>
      </div>
    </header>

    <div class="portal-stage">
      <iframe
        ref="frameRef"
        :src="frameSrc"
        class="portal-frame"
        title="AI 选品工作台"
        allow="clipboard-write"
        @load="handleLoad"
      />
      <p
        v-if="!loaded"
        class="portal-status"
        aria-live="polite"
      >
        正在载入 AI 选品工作台…
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * AI 选品 = 直接嵌入 AI 前台的 /chat。
 *
 * 为什么用 iframe（网页嵌入）而不是代码嵌入：
 * 1. 前台是独立的 Vue 应用，没有 UI 库、自带一整套手写 token（--bg/--ink/
 *    --border）。把它的组件搬进后台会和 Element Plus + 玻璃拟态那套变量互相
 *    污染，两边都得改；iframe 天然隔离样式。
 * 2. 前台还在独立演进。代码嵌入等于把 Conversation.vue 及其十多个子组件、
 *    api 层、auth store 复制一份，之后每次前台改动都要人工同步两处。
 * 3. 生产环境 nginx 把前台挂在 `/`、后台挂在 `/admin/`，同源 —— iframe 直接
 *    共用 localStorage 里的登录态，不需要额外交接。
 *
 * 开发环境两个应用在不同端口（5173 / 5174），localStorage 不共享，所以补一次
 * 「父窗口把令牌 postMessage 给子窗口」的交接：子窗口挂好监听后发
 * `pim-embed-ready`，父窗口只向确定的前台 origin 回发令牌，绝不用 '*'。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const frameRef = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)
const reloadToken = ref(0)

/**
 * 前台地址。生产同源留空即可（相对路径 /chat）；开发默认指向门户的 5174，
 * 可用 VITE_PORTAL_ORIGIN 覆盖（例如指到预发环境）。
 */
const portalOrigin = computed(() => {
  const configured = (import.meta.env.VITE_PORTAL_ORIGIN as string | undefined)?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  return import.meta.env.DEV ? 'http://localhost:5174' : ''
})

/** postMessage 的 targetOrigin —— 必须是确定的 origin，不能用通配符。 */
const targetOrigin = computed(() => portalOrigin.value || window.location.origin)

const frameSrc = computed(() => {
  const suffix = reloadToken.value ? `&r=${reloadToken.value}` : ''
  return `${portalOrigin.value}/chat?embed=1${suffix}`
})

function postSession() {
  const frame = frameRef.value?.contentWindow
  if (!frame) return
  frame.postMessage(
    {
      type: 'pim-embed-session',
      token: authStore.accessToken,
      refreshToken: authStore.refreshToken,
    },
    targetOrigin.value,
  )
}

function handleMessage(event: MessageEvent) {
  if (event.source !== frameRef.value?.contentWindow) return
  if (event.origin !== targetOrigin.value) return
  if ((event.data as { type?: string } | null)?.type !== 'pim-embed-ready') return
  postSession()
}

function handleLoad() {
  loaded.value = true
}

function reload() {
  loaded.value = false
  reloadToken.value = Date.now()
}

function openStandalone() {
  window.open(`${portalOrigin.value}/chat`, '_blank', 'noopener')
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<style scoped>
.ai-portal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.portal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  border: 1px solid var(--pim-border);
  border-radius: var(--pim-radius-sm);
  background: var(--pim-glass);
  box-shadow: var(--pim-shadow);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.portal-copy {
  min-width: 0;
}

.portal-kicker {
  display: block;
  color: var(--pim-text-soft);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
}

.portal-copy p {
  margin: 4px 0 0;
  color: var(--pim-text-faint);
  font-size: 12px;
  line-height: 1.6;
}

.portal-tools {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.portal-btn {
  min-height: 32px;
  padding-inline: 14px;
  font-size: 12px;
}

.portal-stage {
  position: relative;
  height: calc(100vh - 220px);
  min-height: 520px;
  border: 1px solid var(--pim-border);
  border-radius: var(--pim-radius);
  background: #f7f6f2;
  box-shadow: var(--pim-shadow);
  overflow: hidden;
}

.portal-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.portal-status {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: var(--pim-text-faint);
  font-size: 13px;
  letter-spacing: 0.04em;
  pointer-events: none;
}

@media (max-width: 767px) {
  .portal-bar {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px 16px;
  }

  .portal-tools {
    width: 100%;
  }

  .portal-btn {
    flex: 1;
  }

  .portal-stage {
    height: calc(100vh - 240px);
    min-height: 460px;
    border-radius: 22px;
  }
}
</style>
