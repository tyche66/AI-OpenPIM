import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AxiosError } from 'axios'

vi.mock('@/api', () => ({
  productApi: { get: vi.fn() },
  manualApi: { list: vi.fn().mockResolvedValue({ data: { list: [] } }) },
  categoryApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  brandApi: { list: vi.fn().mockResolvedValue({ data: { list: [] } }) },
  supplierApi: { list: vi.fn().mockResolvedValue({ data: { list: [] } }) },
  tagApi: { list: vi.fn().mockResolvedValue({ data: { list: [] } }) },
}))

vi.mock('@/components/ProductImageManager.vue', () => ({
  default: {
    props: ['productId', 'images'],
    template: '<div data-test="product-images" />',
  },
}))
vi.mock('@/components/SceneImageSelector.vue', () => ({
  default: {
    props: ['productId', 'images'],
    template: '<div data-test="scene-images" />',
  },
}))

import { productApi } from '@/api'
import ProductDetail from '@/views/ProductDetail.vue'

const mockGet = productApi.get as ReturnType<typeof vi.fn>

function httpError(status: number) {
  return new AxiosError(
    `HTTP ${status}`,
    undefined,
    undefined,
    undefined,
    { status, statusText: String(status), headers: {}, config: { headers: {} }, data: {} },
  )
}

async function mountDetail() {
  setActivePinia(createPinia())
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/products', component: { template: '<div />' } },
      { path: '/products/:id', component: ProductDetail },
    ],
  })
  await router.push('/products/test-id')
  await router.isReady()
  const wrapper = mount(ProductDetail, { global: { plugins: [router, ElementPlus] } })
  await flushPromises()
  return wrapper
}

describe('ProductDetail error states', () => {
  beforeEach(() => mockGet.mockReset())

  it('shows server error for 500 and retries without reloading the page', async () => {
    mockGet.mockRejectedValueOnce(httpError(500)).mockRejectedValueOnce(httpError(500))
    const wrapper = await mountDetail()
    expect(wrapper.text()).toContain('产品详情加载失败')
    expect(wrapper.text()).not.toContain('产品不存在')
    await wrapper.findAll('button').find((button) => button.text() === '重试')!.trigger('click')
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})

describe('ProductDetail persisted image mappings', () => {
  beforeEach(() => mockGet.mockReset())

  it('restores association ids, cover state, URLs, and binding sort from the API', async () => {
    mockGet.mockResolvedValue({
      id: 'product-1',
      product_no: 'P-001',
      product_name: 'Test product',
      face_price: 100,
      status: 'active',
      stock_status: 'in_stock',
      images: [{
        id: 'product-image-1',
        attachment_id: 'attachment-1',
        file_url: '/api/v1/files/attachment-1/content?token=image-token',
        file_name: 'product.png',
        sort: 4,
        is_cover: true,
      }],
      cover_image_id: 'product-image-1',
      cover_image_url: '/api/v1/files/attachment-1/content?token=image-token',
      cover_image_filename: 'product.png',
      scene_images: [{
        id: 'scene-image-1',
        attachment_id: 'attachment-2',
        file_url: '/api/v1/files/attachment-2/content?token=scene-token',
        name: 'Office',
        file_name: 'scene.png',
        sort: 7,
      }],
      tags: [],
      tag_ids: [],
    })

    const wrapper = await mountDetail()
    const productManager = wrapper.findComponent('[data-test="product-images"]')
    const sceneSelector = wrapper.findComponent('[data-test="scene-images"]')

    expect(productManager.props('images')).toEqual([{
      imageId: 'product-image-1',
      attachmentId: 'attachment-1',
      url: '/api/v1/files/attachment-1/content?token=image-token',
      thumbnailUrl: '/api/v1/files/attachment-1/content?token=image-token',
      name: 'product.png',
      sortOrder: 4,
      isPrimary: true,
    }])
    expect(sceneSelector.props('images')).toEqual([{
      sceneImageId: 'scene-image-1',
      attachmentId: 'attachment-2',
      url: '/api/v1/files/attachment-2/content?token=scene-token',
      thumbnailUrl: '/api/v1/files/attachment-2/content?token=scene-token',
      name: 'Office',
      sortOrder: 7,
    }])
  })
})
