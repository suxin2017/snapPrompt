import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Database, FolderTree, ImageOff, Search } from 'lucide-react'

import {
  fetchDatasetIndex,
  getTopCategories,
  loadPromptAssets,
  type DatasetManifestItem,
  type PromptAssetItem,
} from '@/lib/promptDatasets'

type StatCardProps = {
  label: string
  value: string
  hint: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-(--border) bg-white/90 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-(--muted-foreground)">{hint}</p>
    </article>
  )
}

export function BlocksPreviewDesktop() {
  const [manifest, setManifest] = useState<DatasetManifestItem[]>([])
  const [manifestLoading, setManifestLoading] = useState(true)
  const [manifestError, setManifestError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [assets, setAssets] = useState<PromptAssetItem[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [assetsError, setAssetsError] = useState<string | null>(null)
  const [imageFailures, setImageFailures] = useState<Record<string, true>>({})

  useEffect(() => {
    let active = true

    fetchDatasetIndex()
      .then((index) => {
        if (!active) {
          return
        }

        setManifest(index.items)
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setManifestError(error instanceof Error ? error.message : '加载数据失败')
      })
      .finally(() => {
        if (active) {
          setManifestLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!manifest.length) {
      setAssets([])
      setAssetsLoading(false)
      return
    }

    let active = true

    setAssetsLoading(true)
    setAssetsError(null)
    setImageFailures({})

    Promise.all(manifest.map((dataset) => loadPromptAssets(dataset)))
      .then((result) => {
        if (!active) {
          return
        }

        setAssets(result.flat())
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setAssetsError(error instanceof Error ? error.message : '加载素材失败')
      })
      .finally(() => {
        if (active) {
          setAssetsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [manifest])

  const topCategories = useMemo(() => getTopCategories(manifest), [manifest])

  const visibleAssets = useMemo(() => {
    let filtered = assets

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) => item.title_cn.toLowerCase().includes(query) || item.prompt_en.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [assets, searchQuery])

  const datasetGroups = useMemo(() => {
    return manifest.map((dataset) => {
      const items = visibleAssets.filter((asset) => asset.datasetId === dataset.id)
      const allItems = assets.filter((asset) => asset.datasetId === dataset.id)
      const duplicateUuidCount = allItems.length - new Set(allItems.map((asset) => asset.uuid)).size
      const missingTitleCount = allItems.filter((asset) => !asset.title_cn.trim()).length
      const missingPromptCount = allItems.filter((asset) => !asset.prompt_en.trim()).length
      const brokenImageCount = allItems.filter((asset) => imageFailures[asset.uuid]).length

      const diagnostics: string[] = []
      if (dataset.itemCount !== allItems.length) {
        diagnostics.push(`清单声明 ${dataset.itemCount} 条，实际加载 ${allItems.length} 条。`)
      }
      if (missingTitleCount > 0) {
        diagnostics.push(`${missingTitleCount} 条缺少 title_cn。`)
      }
      if (missingPromptCount > 0) {
        diagnostics.push(`${missingPromptCount} 条缺少 prompt_en。`)
      }
      if (duplicateUuidCount > 0) {
        diagnostics.push(`${duplicateUuidCount} 条存在重复 uuid。`)
      }
      if (brokenImageCount > 0) {
        diagnostics.push(`${brokenImageCount} 张图片加载失败。`)
      }

      return {
        dataset,
        items,
        allItems,
        diagnostics,
      }
    })
  }, [assets, imageFailures, manifest, visibleAssets])

  const diagnostics = useMemo(() => {
    const items: string[] = []
    const missingTitleCount = assets.filter((item) => !item.title_cn.trim()).length
    const missingPromptCount = assets.filter((item) => !item.prompt_en.trim()).length
    const duplicateUuidCount = assets.length - new Set(assets.map((item) => item.uuid)).size
    const brokenImageCount = Object.keys(imageFailures).length
    const expectedAssetCount = manifest.reduce((sum, dataset) => sum + dataset.itemCount, 0)

    if (expectedAssetCount !== assets.length) {
      items.push(`总清单声明 ${expectedAssetCount} 条，当前实际加载到 ${assets.length} 条。`)
    }
    if (missingTitleCount > 0) {
      items.push(`${missingTitleCount} 条素材缺少 title_cn。`)
    }
    if (missingPromptCount > 0) {
      items.push(`${missingPromptCount} 条素材缺少 prompt_en。`)
    }
    if (duplicateUuidCount > 0) {
      items.push(`${duplicateUuidCount} 条素材存在重复 uuid。`)
    }
    if (brokenImageCount > 0) {
      items.push(`${brokenImageCount} 张图片加载失败，可能是路径或文件缺失。`)
    }

    return items
  }, [assets, imageFailures, manifest])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-(--border) bg-linear-to-br from-[#fffaf2] via-white to-[#f6efe4] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-(--muted-foreground)">H5 积木预览</p>
            <h2 className="mt-2 text-3xl font-semibold">独立检查 H5 积木数据与渲染结果</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-(--muted-foreground)">
            这个页面不再挂载 H5 组件，只复用同一份 datasets 数据。你可以在 PC 端直接核对分类、数据包、素材内容和图片加载状态，快速定位错误来源。
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="一级分类" value={String(topCategories.length)} hint="来自 manifest 的 top category 数量" />
          <StatCard label="数据包" value={String(manifest.length)} hint="当前全部数据包数量" />
          <StatCard label="全部素材" value={String(assets.length)} hint="当前已加载的全部素材条数" />
          <StatCard label="图片异常" value={String(Object.keys(imageFailures).length)} hint="当前页已检测到的图片加载失败数" />
        </div>
      </section>

      {manifestLoading ? (
        <div className="rounded-3xl border border-(--border) bg-white/90 p-6 text-sm text-(--muted-foreground)">正在加载 H5 数据清单...</div>
      ) : null}

      {manifestError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>{manifestError}</p>
          <p className="mt-2">请确认已经执行 pnpm run datasets:prepare。</p>
        </div>
      ) : null}

      {!manifestLoading && !manifestError ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-(--border) bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-2 rounded-2xl border border-(--border) bg-(--background) px-3 py-3">
                <Search size={16} className="text-(--muted-foreground)" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="搜索中文名或英文 prompt"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-(--muted-foreground)"
                />
              </div>
            </section>

            {assetsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="space-y-3 rounded-3xl border border-(--border) bg-white/80 p-4">
                    <div className="aspect-square animate-pulse rounded-2xl bg-(--muted)" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-(--muted)" />
                    <div className="h-4 w-full animate-pulse rounded bg-(--muted)" />
                  </div>
                ))}
              </div>
            ) : null}

            {assetsError ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{assetsError}</div>
            ) : null}

            {!assetsLoading && !assetsError && visibleAssets.length === 0 ? (
              <div className="rounded-3xl border border-(--border) bg-white/90 p-6 text-sm text-(--muted-foreground)">
                当前筛选条件下没有素材。
              </div>
            ) : null}

            {datasetGroups.length > 0 ? (
              <div className="space-y-6">
                {datasetGroups.map(({ dataset, items, allItems, diagnostics: datasetDiagnostics }) => (
                  <section key={dataset.id} className="rounded-3xl border border-(--border) bg-white/90 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-(--muted-foreground)">{dataset.category}</p>
                        <h3 className="mt-1 text-xl font-semibold">{dataset.name}</h3>
                        <p className="mt-2 text-sm text-(--muted-foreground)">
                          数据包 {dataset.id} · 清单 {dataset.itemCount} 条 · 当前展示 {items.length} 条
                        </p>
                      </div>
                      {datasetDiagnostics.length > 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          {datasetDiagnostics.join(' ')}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          数据包检查通过
                        </div>
                      )}
                    </div>

                    {allItems.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        这个数据包没有加载到任何素材。
                      </div>
                    ) : null}

                    {items.length > 0 ? (
                      <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                        {items.map((asset) => {
                          const hasImageFailure = Boolean(imageFailures[asset.uuid])

                          return (
                            <article key={asset.uuid} className="overflow-hidden rounded-3xl border border-(--border) bg-white/95 shadow-sm">
                              <div className="relative aspect-square bg-[#f7f3ee]">
                                {hasImageFailure ? (
                                  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-red-600">
                                    <ImageOff size={20} />
                                    <span>图片加载失败</span>
                                  </div>
                                ) : (
                                  <img
                                    src={asset.imageUrl}
                                    alt={asset.title_cn}
                                    loading="lazy"
                                    onError={() => {
                                      setImageFailures((current) => {
                                        if (current[asset.uuid]) {
                                          return current
                                        }

                                        return { ...current, [asset.uuid]: true }
                                      })
                                    }}
                                    className="h-full w-full object-contain p-4"
                                  />
                                )}
                              </div>
                              <div className="space-y-3 p-4">
                                <div>
                                  <div className="flex items-start justify-between gap-3">
                                    <h4 className="line-clamp-2 text-sm font-semibold leading-5">{asset.title_cn || '未填写标题'}</h4>
                                    <span className="shrink-0 rounded-full bg-(--muted) px-2 py-1 text-[11px] text-(--muted-foreground)">
                                      {asset.datasetName}
                                    </span>
                                  </div>
                                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-(--muted-foreground)">{asset.prompt_en || '缺少 prompt_en'}</p>
                                </div>
                                <dl className="grid gap-2 text-xs text-(--muted-foreground)">
                                  <div className="flex items-center justify-between gap-3">
                                    <dt>uuid</dt>
                                    <dd className="max-w-[60%] truncate text-right">{asset.uuid}</dd>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <dt>文件</dt>
                                    <dd className="max-w-[60%] truncate text-right">{asset.filename}</dd>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <dt>分类</dt>
                                    <dd className="max-w-[60%] truncate text-right">{asset.category}</dd>
                                  </div>
                                </dl>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    ) : searchQuery.trim() ? (
                      <div className="mt-4 rounded-2xl border border-(--border) bg-(--muted)/30 px-4 py-3 text-sm text-(--muted-foreground)">
                        这个数据包没有匹配当前搜索词的素材。
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-3xl border border-(--border) bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <FolderTree size={16} className="text-(--muted-foreground)" />
                <h3 className="text-base font-semibold">当前上下文</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-(--muted-foreground)">一级分类</dt>
                  <dd className="text-right">{topCategories.length}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-(--muted-foreground)">数据包</dt>
                  <dd className="text-right">{manifest.length}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-(--muted-foreground)">当前展示</dt>
                  <dd className="max-w-[60%] text-right">{visibleAssets.length} 条素材</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-(--muted-foreground)">搜索词</dt>
                  <dd className="max-w-[60%] text-right">{searchQuery.trim() || '未筛选'}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-(--border) bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-(--muted-foreground)" />
                <h3 className="text-base font-semibold">数据诊断</h3>
              </div>
              {diagnostics.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {diagnostics.map((item) => (
                    <div key={item} className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              ) : manifest.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  全量数据暂未发现明显的结构异常。
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-(--border) bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <FolderTree size={16} className="text-(--muted-foreground)" />
                <h3 className="text-base font-semibold">数据包目录</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {manifest.map((dataset) => (
                  <div key={dataset.id} className="rounded-2xl border border-(--border) bg-(--background) px-3 py-3">
                    <p className="font-medium">{dataset.name}</p>
                    <p className="mt-1 text-xs text-(--muted-foreground)">{dataset.category} · {dataset.itemCount} 条</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      ) : null}
    </div>
  )
}