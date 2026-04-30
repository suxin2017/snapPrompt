import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useH5Recipe } from '@/contexts/h5RecipeContext'
import {
  fetchDatasetIndex,
  filterDatasetsByCategory,
  findCategoryAggregate,
  getSubCategories,
  getTopCategories,
  loadCategoryAssets,
  type CategoryManifestItem,
  type DatasetManifestItem,
  type PromptAssetItem,
} from '@/lib/promptDatasets'

export function CutToolMobile() {
  const { addRecipeItem } = useH5Recipe()
  const [manifest, setManifest] = useState<DatasetManifestItem[]>([])
  const [categoryAggregates, setCategoryAggregates] = useState<CategoryManifestItem[]>([])
  const [manifestLoading, setManifestLoading] = useState(true)
  const [manifestError, setManifestError] = useState<string | null>(null)

  const [activeTopCategory, setActiveTopCategory] = useState('')
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null)
  const [activeDatasetId, setActiveDatasetId] = useState('')

  const [assets, setAssets] = useState<PromptAssetItem[]>([])
  const [loadedCategoryId, setLoadedCategoryId] = useState('')
  const [assetErrors, setAssetErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    fetchDatasetIndex()
      .then((index) => {
        if (!active) {
          return
        }

        setManifest(index.items)
        setCategoryAggregates(index.categories)
        const topCategories = getTopCategories(index.items)
        setActiveTopCategory(topCategories[0] ?? '')
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

  const topCategories = useMemo(() => getTopCategories(manifest), [manifest])
  const resolvedTopCategory = useMemo(() => {
    if (!topCategories.length) {
      return ''
    }

    if (topCategories.includes(activeTopCategory)) {
      return activeTopCategory
    }

    return topCategories[0]
  }, [activeTopCategory, topCategories])

  const subCategories = useMemo(() => {
    if (!resolvedTopCategory) {
      return []
    }

    return getSubCategories(manifest, resolvedTopCategory)
  }, [manifest, resolvedTopCategory])

  const resolvedSubCategory = useMemo(() => {
    if (!activeSubCategory) {
      return null
    }

    if (subCategories.includes(activeSubCategory)) {
      return activeSubCategory
    }

    return null
  }, [activeSubCategory, subCategories])

  const filteredDatasets = useMemo(() => {
    if (!resolvedTopCategory) {
      return []
    }

    return filterDatasetsByCategory(manifest, resolvedTopCategory, resolvedSubCategory)
  }, [manifest, resolvedSubCategory, resolvedTopCategory])

  const resolvedDatasetId = useMemo(() => {
    if (!filteredDatasets.length) {
      return ''
    }

    if (filteredDatasets.some((item) => item.id === activeDatasetId)) {
      return activeDatasetId
    }

    return filteredDatasets[0].id
  }, [activeDatasetId, filteredDatasets])

  const activeAggregate = useMemo(
    () => findCategoryAggregate(categoryAggregates, resolvedTopCategory, resolvedSubCategory),
    [categoryAggregates, resolvedSubCategory, resolvedTopCategory],
  )

  useEffect(() => {
    if (!activeAggregate) {
      return
    }

    let active = true

    loadCategoryAssets(activeAggregate)
      .then((items) => {
        if (!active) {
          return
        }

        setAssets(items)
        setLoadedCategoryId(activeAggregate.id)
        setAssetErrors((prev) => {
          if (!prev[activeAggregate.id]) {
            return prev
          }

          const next = { ...prev }
          delete next[activeAggregate.id]
          return next
        })
      })
      .catch((error) => {
        if (!active) {
          return
        }

        setAssetErrors((prev) => ({
          ...prev,
          [activeAggregate.id]: error instanceof Error ? error.message : '加载素材失败',
        }))
      })

    return () => {
      active = false
    }
  }, [activeAggregate])

  const assetLoading = activeAggregate ? loadedCategoryId !== activeAggregate.id : false
  const assetError = activeAggregate ? (assetErrors[activeAggregate.id] ?? null) : null
  const visibleAssets = useMemo(() => {
    if (!activeAggregate || loadedCategoryId !== activeAggregate.id) {
      return []
    }

    if (!resolvedDatasetId) {
      return assets
    }

    return assets.filter((item) => item.datasetId === resolvedDatasetId)
  }, [activeAggregate, assets, loadedCategoryId, resolvedDatasetId])

  if (manifestLoading) {
    return <div className="rounded-2xl bg-(--card) p-4 text-sm text-(--muted-foreground)">正在加载分类数据...</div>
  }

  if (manifestError) {
    return (
      <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{manifestError}</p>
        <p>请确认已执行 pnpm run datasets:prepare。</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-36">
      <section className="space-y-4 rounded-3xl border border-(--border) bg-(--card) p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">选择积木</h2>
          <span className="text-xs text-(--muted-foreground)">{categoryAggregates.length} 个分类</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {topCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setActiveTopCategory(category)
                setActiveSubCategory(null)
              }}
              className={[
                'shrink-0 rounded-full border px-3 py-1.5 text-sm transition',
                resolvedTopCategory === category
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-(--border) bg-(--background) text-(--muted-foreground)',
              ].join(' ')}
            >
              {category}
            </button>
          ))}
        </div>

        {subCategories.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveSubCategory(null)}
              className={[
                'shrink-0 rounded-full border px-3 py-1 text-xs transition',
                !resolvedSubCategory
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-(--border) bg-(--background) text-(--muted-foreground)',
              ].join(' ')}
            >
              全部
            </button>
            {subCategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setActiveSubCategory(sub)}
                className={[
                  'shrink-0 rounded-full border px-3 py-1 text-xs transition',
                  resolvedSubCategory === sub
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'border-(--border) bg-(--background) text-(--muted-foreground)',
                ].join(' ')}
              >
                {sub}
              </button>
            ))}
          </div>
        ) : null}

        {filteredDatasets.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filteredDatasets.map((dataset) => (
              <button
                key={dataset.id}
                type="button"
                onClick={() => setActiveDatasetId(dataset.id)}
                className={[
                  'shrink-0 rounded-xl border px-3 py-2 text-sm transition',
                  resolvedDatasetId === dataset.id
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'border-(--border) bg-(--background) text-(--muted-foreground)',
                ].join(' ')}
              >
                {dataset.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        {assetLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-3 rounded-2xl border border-(--border) bg-(--card) p-3">
                <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-(--muted)" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-(--muted)" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-(--muted)" />
                  <div className="h-7 w-16 animate-pulse rounded-lg bg-(--muted)" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {assetError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{assetError}</div>
        ) : null}

        {!assetLoading && !assetError && visibleAssets.length === 0 ? (
          <div className="rounded-2xl bg-(--card) p-4 text-sm text-(--muted-foreground)">当前分类暂无素材</div>
        ) : null}

        {visibleAssets.map((asset) => (
          <article key={asset.uuid} className="flex gap-3 rounded-2xl border border-(--border) bg-(--card) p-3 shadow-sm">
            <img src={asset.imageUrl} alt={asset.title_cn} loading="lazy" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="truncate font-medium">{asset.title_cn}</h3>
              <p className="line-clamp-2 text-xs text-(--muted-foreground)">{asset.prompt_en}</p>
              <Button size="sm" className="mt-2" onClick={() => addRecipeItem(asset)}>
                添加
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
