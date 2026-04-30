import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useH5Recipe } from '@/contexts/h5RecipeContext'
import { useI18n } from '@/contexts/i18nContext'
import { AssetDetailModal } from '@/features/h5/AssetDetailModal'
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
  const { t } = useI18n()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<PromptAssetItem | null>(null)

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

    let filtered = !resolvedDatasetId ? assets : assets.filter((item) => item.datasetId === resolvedDatasetId)

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title_cn.toLowerCase().includes(query) || item.prompt_en.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [activeAggregate, assets, loadedCategoryId, resolvedDatasetId, searchQuery])

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
      <section className="space-y-3 rounded-3xl border border-(--border) bg-(--card) p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('selectBlocks')}</h2>
          <span className="text-xs text-(--muted-foreground)">{categoryAggregates.length} {t('categories')}</span>
        </div>

        {/* 一级分类 - 下拉菜单 */}
        <select
          value={resolvedTopCategory}
          onChange={(e) => {
            setActiveTopCategory(e.target.value)
            setActiveSubCategory(null)
          }}
          className="w-full rounded-xl border border-(--border) bg-(--background) px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
        >
          {topCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        {/* 二级分类 - 横向 Chip */}
        {subCategories.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-(--muted-foreground)">{t('subCategories')}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveSubCategory(null)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs transition',
                  !resolvedSubCategory
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'border-(--border) bg-(--background) text-(--muted-foreground)',
                ].join(' ')}
              >
                {t('allCategories')}
              </button>
              {subCategories.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setActiveSubCategory(sub)}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs transition',
                    resolvedSubCategory === sub
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'border-(--border) bg-(--background) text-(--muted-foreground)',
                  ].join(' ')}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* 数据包 - 横向 Chip */}
        {filteredDatasets.length > 1 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-(--muted-foreground)">{t('dataSets')}</p>
            <div className="flex flex-wrap gap-2">
              {filteredDatasets.map((dataset) => (
                <button
                  key={dataset.id}
                  type="button"
                  onClick={() => setActiveDatasetId(dataset.id)}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs transition',
                    resolvedDatasetId === dataset.id
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'border-(--border) bg-(--background) text-(--muted-foreground)',
                  ].join(' ')}
                >
                  {dataset.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-2 rounded-2xl border border-(--border) bg-(--card) p-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-(--muted-foreground)" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-(--muted-foreground)"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-(--muted-foreground) hover:text-(--foreground)"
              aria-label="清空搜索"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </section>

      <section>
        {assetLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="space-y-2">
                <div className="aspect-square animate-pulse rounded-xl bg-(--muted)" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-(--muted)" />
                <div className="h-3 w-full animate-pulse rounded bg-(--muted)" />
                <div className="h-7 w-full animate-pulse rounded-lg bg-(--muted)" />
              </div>
            ))}
          </div>
        ) : null}

        {assetError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{assetError}</div>
        ) : null}

        {!assetLoading && !assetError && visibleAssets.length === 0 ? (
          <div className="rounded-2xl bg-(--card) p-4 text-sm text-(--muted-foreground)">{t('noData')}</div>
        ) : null}

        {visibleAssets.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleAssets.map((asset) => (
              <article key={asset.uuid} className="space-y-3 overflow-hidden rounded-2xl border border-(--border) bg-(--card) p-3 shadow-sm hover:shadow-md transition">
                {/* 点击图片查看详情 */}
                <button
                  type="button"
                  onClick={() => setSelectedAsset(asset)}
                  className="w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                  aria-label={`查看 ${asset.title_cn} 详情`}
                >
                  <img
                    src={asset.imageUrl}
                    alt={asset.title_cn}
                    loading="lazy"
                    className="aspect-square w-full object-contain hover:scale-105 transition duration-200"
                  />
                </button>

                {/* 信息 */}
                <div className="space-y-2 px-1">
                  <h3 className="line-clamp-2 font-medium leading-tight text-sm">{asset.title_cn}</h3>
                  <p className="line-clamp-2 text-xs text-(--muted-foreground)">{asset.prompt_en}</p>
                </div>

                {/* 按钮 */}
                <Button size="sm" className="w-full" onClick={() => addRecipeItem(asset)}>
                  {t('add')}
                </Button>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  )
}
