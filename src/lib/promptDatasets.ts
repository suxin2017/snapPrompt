export type DatasetManifestItem = {
  id: string
  category: string
  name: string
  zipPath: string
  dataPath: string
  itemCount: number
  size: number
  updatedAt: string
}

export type CategoryManifestItem = {
  id: string
  topCategory: string
  subCategory: string | null
  dataPath: string
  itemCount: number
  datasetCount: number
}

type DatasetManifestPayload = {
  generatedAt: string
  sourceRoot: string
  count: number
  items: DatasetManifestItem[]
  categories: CategoryManifestItem[]
}

type DatasetPayloadItem = {
  uuid: string
  filename: string
  title_cn: string
  prompt_en: string
  image: string
}

type DatasetPayload = {
  datasetId: string
  sourceZipPath: string
  items: DatasetPayloadItem[]
}

type CategoryPayloadItem = DatasetPayloadItem & {
  datasetId: string
  datasetName: string
  category: string
}

type CategoryPayload = {
  categoryId: string
  topCategory: string
  subCategory: string | null
  items: CategoryPayloadItem[]
}

export type PromptAssetItem = DatasetPayloadItem & {
  imageUrl: string
  category: string
  datasetName: string
  datasetId: string
}

export type RandomTopCategoryPick = {
  topCategory: string
  asset: PromptAssetItem
}

const MAX_CACHE_SIZE = 8
const manifestUrl = `${import.meta.env.BASE_URL}datasets/manifest.json`
const datasetCache = new Map<string, PromptAssetItem[]>()
const categoryCache = new Map<string, PromptAssetItem[]>()
const pendingLoads = new Map<string, Promise<PromptAssetItem[]>>()
const pendingCategoryLoads = new Map<string, Promise<PromptAssetItem[]>>()

let manifestCache: DatasetManifestPayload | null = null

function normalizeSlashes(pathValue: string) {
  return pathValue.replace(/\\/g, '/')
}

function encodePath(pathValue: string) {
  return normalizeSlashes(pathValue)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildDatasetUrl(relativePath: string) {
  return `${import.meta.env.BASE_URL}datasets/${encodePath(relativePath)}`
}

function withOfflineHint(message: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return `${message}（当前离线，且本地缓存中没有该资源）`
  }

  return message
}

function touchCacheEntry(cache: Map<string, PromptAssetItem[]>, key: string, value: PromptAssetItem[]) {
  cache.delete(key)
  cache.set(key, value)
}

function pruneCacheIfNeeded(cache: Map<string, PromptAssetItem[]>) {
  while (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) {
      break
    }

    cache.delete(oldestKey)
  }
}

export async function fetchDatasetManifest() {
  const index = await fetchDatasetIndex()
  return index.items
}

export async function fetchDatasetIndex() {
  if (manifestCache) {
    return manifestCache
  }

  let response: Response

  try {
    response = await fetch(manifestUrl)
  } catch {
    throw new Error(withOfflineHint('无法加载 datasets manifest，请先运行 pnpm run datasets:prepare'))
  }

  if (!response.ok) {
    throw new Error(withOfflineHint('无法加载 datasets manifest，请先运行 pnpm run datasets:prepare'))
  }

  const payload = (await response.json()) as DatasetManifestPayload
  manifestCache = payload
  return manifestCache
}

export function getTopCategories(items: DatasetManifestItem[]) {
  const topSet = new Set<string>()

  for (const item of items) {
    const category = normalizeSlashes(item.category)
    const top = category.split('/')[0] || '未分类'
    topSet.add(top)
  }

  return [...topSet]
}

export function getSubCategories(items: DatasetManifestItem[], topCategory: string) {
  const subSet = new Set<string>()

  for (const item of items) {
    const category = normalizeSlashes(item.category)
    const [top, ...rest] = category.split('/')
    if (top !== topCategory) {
      continue
    }

    const sub = rest.join('/')
    if (sub) {
      subSet.add(sub)
    }
  }

  return [...subSet]
}

export type FlatCategory = {
  top: string
  sub: string | null
  label: string // e.g. "下身 / 半裙" or "上衣"
}

export function getFlatCategories(items: DatasetManifestItem[]): FlatCategory[] {
  const seen = new Set<string>()
  const result: FlatCategory[] = []

  for (const item of items) {
    const category = normalizeSlashes(item.category)
    const [top, ...rest] = category.split('/')
    const sub = rest.length > 0 ? rest.join('/') : null
    const key = `${top}|||${sub ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ top, sub, label: sub ? `${top} / ${sub}` : top })
  }

  return result
}

export function filterDatasetsByCategory(items: DatasetManifestItem[], topCategory: string, subCategory: string | null) {
  return items.filter((item) => {
    const category = normalizeSlashes(item.category)
    const [top, ...rest] = category.split('/')
    if (top !== topCategory) {
      return false
    }

    if (!subCategory) {
      return true
    }

    return rest.join('/') === subCategory
  })
}

export function findCategoryAggregate(
  categories: CategoryManifestItem[],
  topCategory: string,
  subCategory: string | null,
) {
  return (
    categories.find((item) => item.topCategory === topCategory && item.subCategory === subCategory) ?? null
  )
}

export async function loadPromptAssets(dataset: DatasetManifestItem) {
  const cacheKey = dataset.id
  const cached = datasetCache.get(cacheKey)
  if (cached) {
    touchCacheEntry(datasetCache, cacheKey, cached)
    return cached
  }

  const pending = pendingLoads.get(cacheKey)
  if (pending) {
    return pending
  }

  const loaderPromise = (async () => {
    let response: Response

    try {
      response = await fetch(buildDatasetUrl(dataset.dataPath))
    } catch {
      throw new Error(withOfflineHint(`加载数据失败: ${dataset.name}`))
    }

    if (!response.ok) {
      throw new Error(withOfflineHint(`加载数据失败: ${dataset.name}`))
    }

    const payload = (await response.json()) as DatasetPayload
    const mapped = payload.items.map((item) => ({
      ...item,
      imageUrl: buildDatasetUrl(item.image),
      category: dataset.category,
      datasetName: dataset.name,
      datasetId: dataset.id,
    }))

    datasetCache.set(cacheKey, mapped)
    pruneCacheIfNeeded(datasetCache)

    return mapped
  })()

  pendingLoads.set(cacheKey, loaderPromise)

  try {
    return await loaderPromise
  } finally {
    pendingLoads.delete(cacheKey)
  }
}

export async function loadCategoryAssets(category: CategoryManifestItem) {
  const cacheKey = category.id
  const cached = categoryCache.get(cacheKey)
  if (cached) {
    touchCacheEntry(categoryCache, cacheKey, cached)
    return cached
  }

  const pending = pendingCategoryLoads.get(cacheKey)
  if (pending) {
    return pending
  }

  const loaderPromise = (async () => {
    let response: Response

    try {
      response = await fetch(buildDatasetUrl(category.dataPath))
    } catch {
      throw new Error(withOfflineHint(`加载分类数据失败: ${category.topCategory}`))
    }

    if (!response.ok) {
      throw new Error(withOfflineHint(`加载分类数据失败: ${category.topCategory}`))
    }

    const payload = (await response.json()) as CategoryPayload
    const mapped = payload.items.map((item) => ({
      uuid: item.uuid,
      filename: item.filename,
      title_cn: item.title_cn,
      prompt_en: item.prompt_en,
      image: item.image,
      imageUrl: buildDatasetUrl(item.image),
      category: item.category,
      datasetName: item.datasetName,
      datasetId: item.datasetId,
    }))

    categoryCache.set(cacheKey, mapped)
    pruneCacheIfNeeded(categoryCache)

    return mapped
  })()

  pendingCategoryLoads.set(cacheKey, loaderPromise)

  try {
    return await loaderPromise
  } finally {
    pendingCategoryLoads.delete(cacheKey)
  }
}

export async function pickRandomAssetsByTopCategory(categories: CategoryManifestItem[]) {
  const grouped = new Map<string, CategoryManifestItem[]>()

  for (const category of categories) {
    const bucket = grouped.get(category.topCategory)
    if (bucket) {
      bucket.push(category)
      continue
    }

    grouped.set(category.topCategory, [category])
  }

  const picks = await Promise.all(
    [...grouped.entries()].map(async ([topCategory, scopedCategories]) => {
      try {
        const groupedAssets = await Promise.all(scopedCategories.map((item) => loadCategoryAssets(item)))
        const pool = groupedAssets.flat()
        if (!pool.length) {
          return null
        }

        const randomIndex = Math.floor(Math.random() * pool.length)
        return { topCategory, asset: pool[randomIndex] }
      } catch {
        return null
      }
    }),
  )

  return picks.filter((item): item is RandomTopCategoryPick => item !== null)
}
