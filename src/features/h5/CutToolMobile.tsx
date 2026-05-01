import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Search, X, Plus, Minus, ChevronLeft, LayoutGrid } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'

import { useH5Recipe } from '@/contexts/h5RecipeContext'
import { useI18n } from '@/contexts/i18nContext'
import { AssetDetailModal } from '@/features/h5/AssetDetailModal'
import {
  fetchDatasetIndex,
  findCategoryAggregate,
  getSubCategories,
  getTopCategories,
  loadCategoryAssets,
  type CategoryManifestItem,
  type DatasetManifestItem,
  type PromptAssetItem,
} from '@/lib/promptDatasets'

const PREFERRED_TOP_FLOW = ['表情', '发型', '角度']
const LONG_PRESS_MS = 360
const SWIPE_THRESHOLD = 56
const SWIPE_VELOCITY = 0.45

function preventImageDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

function AssetImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const handleLoad = useCallback(() => setLoaded(true), [])
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse rounded-xl bg-(--muted)" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={preventImageDefault}
        onDragStart={preventImageDefault}
        onLoad={handleLoad}
        className={[
          'aspect-square w-full object-contain pointer-events-none select-none transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      />
    </div>
  )
}

const GRID_COLS = 2

interface VirtualAssetGridProps {
  assets: PromptAssetItem[]
  recipeIds: Set<string>
  addPulseId: string | null
  onPressStart: (asset: PromptAssetItem) => void
  onPressEnd: (asset: PromptAssetItem) => void
  onPressLeave: () => void
  onToggle: (asset: PromptAssetItem) => void
}

function VirtualAssetGrid({
  assets,
  recipeIds,
  addPulseId,
  onPressStart,
  onPressEnd,
  onPressLeave,
  onToggle,
}: VirtualAssetGridProps) {
  const { t } = useI18n()
  const parentRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => {
    const result: PromptAssetItem[][] = []
    for (let i = 0; i < assets.length; i += GRID_COLS) {
      result.push(assets.slice(i, i + GRID_COLS))
    }
    return result
  }, [assets])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250,
    overscan: 4,
  })

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto overscroll-contain px-2 pt-2 pb-[calc(70px+env(safe-area-inset-bottom,0px))]"
      style={{ height: '100%' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vRow) => {
          const rowItems = rows[vRow.index]
          return (
            <div
              key={vRow.key}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              style={{ position: 'absolute', top: vRow.start, left: 0, right: 0 }}
              className="grid grid-cols-2 gap-3 pb-3"
            >
              {rowItems.map((asset) => {
                const inRecipe = recipeIds.has(asset.uuid)
                return (
                  <article
                    key={asset.uuid}
                    className="space-y-2 overflow-hidden rounded-2xl border border-(--border) bg-(--card) p-2.5 shadow-sm"
                  >
                    <button
                      type="button"
                      onPointerDown={() => onPressStart(asset)}
                      onPointerUp={() => onPressEnd(asset)}
                      onPointerLeave={onPressLeave}
                      onPointerCancel={onPressLeave}
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full overflow-hidden rounded-xl select-none touch-manipulation focus:outline-none focus:ring-2 focus:ring-(--primary) focus:ring-offset-2"
                      aria-label={`${asset.title_cn}，短按添加，长按查看详情`}
                    >
                      <AssetImage src={asset.imageUrl} alt={asset.title_cn} />
                    </button>
                    <h3 className="line-clamp-2 px-0.5 text-xs font-medium leading-tight text-center">
                      {asset.title_cn}
                    </h3>
                    <motion.button
                      type="button"
                      onClick={() => onToggle(asset)}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      className={[
                        'relative flex w-full items-center justify-center gap-1 overflow-hidden rounded-lg py-1.5 text-xs font-medium transition',
                        inRecipe
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-(--primary) text-(--primary-foreground) hover:opacity-90',
                      ].join(' ')}
                    >
                      <AnimatePresence>
                        {addPulseId === asset.uuid && !inRecipe ? (
                          <motion.span
                            key="pulse"
                            initial={{ opacity: 0.42, scale: 0.7 }}
                            animate={{ opacity: 0, scale: 1.25 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.42, ease: 'easeOut' }}
                            className="pointer-events-none absolute inset-0 bg-white/25"
                          />
                        ) : null}
                      </AnimatePresence>
                      <AnimatePresence mode="wait" initial={false}>
                        {inRecipe ? (
                          <motion.span
                            key="delete"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="flex items-center gap-1"
                          >
                            <Minus size={12} />
                            {t('delete')}
                          </motion.span>
                        ) : (
                          <motion.span
                            key="add"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className="flex items-center gap-1"
                          >
                            <Plus size={12} />
                            {t('add')}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </article>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CutToolMobile() {
  const { addRecipeItem, removeRecipeItem, recipeItems } = useH5Recipe()
  const { t } = useI18n()

  const [manifest, setManifest] = useState<DatasetManifestItem[]>([])
  const [categoryAggregates, setCategoryAggregates] = useState<CategoryManifestItem[]>([])
  const [manifestLoading, setManifestLoading] = useState(true)
  const [manifestError, setManifestError] = useState<string | null>(null)
  const [topFlow, setTopFlow] = useState<string[]>([])
  const [selectedSubByTop, setSelectedSubByTop] = useState<Record<string, string | null>>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [assets, setAssets] = useState<PromptAssetItem[]>([])
  const [loadedCategoryId, setLoadedCategoryId] = useState('')
  const [assetErrors, setAssetErrors] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<PromptAssetItem | null>(null)
  const [addPulseId, setAddPulseId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const addPulseTimer = useRef<number | null>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressTriggered = useRef(false)
  const dragStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetchDatasetIndex()
      .then((index) => {
        if (!active) return
        setManifest(index.items)
        setCategoryAggregates(index.categories)
        const allTop = getTopCategories(index.items)
        const preferred = PREFERRED_TOP_FLOW.filter((name) => allTop.includes(name))
        const fallback = allTop.filter((name) => !preferred.includes(name))
        setTopFlow([...preferred, ...fallback])
      })
      .catch((error) => {
        if (!active) return
        setManifestError(error instanceof Error ? error.message : '加载数据失败')
      })
      .finally(() => {
        if (active) setManifestLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const resolvedStep = useMemo(
    () => Math.min(currentStep, Math.max(0, topFlow.length - 1)),
    [currentStep, topFlow.length],
  )
  const activeTopCategory = topFlow[resolvedStep] ?? ''
  const activeSubCategory = activeTopCategory ? (selectedSubByTop[activeTopCategory] ?? null) : null

  const subCategories = useMemo(() => {
    if (!activeTopCategory) return []
    return getSubCategories(manifest, activeTopCategory)
  }, [manifest, activeTopCategory])

  const activeAggregate = useMemo(
    () => findCategoryAggregate(categoryAggregates, activeTopCategory, activeSubCategory),
    [categoryAggregates, activeTopCategory, activeSubCategory],
  )

  useEffect(() => {
    if (!activeAggregate) return
    let active = true
    loadCategoryAssets(activeAggregate)
      .then((items) => {
        if (!active) return
        setAssets(items)
        setLoadedCategoryId(activeAggregate.id)
        setAssetErrors((prev) => {
          if (!prev[activeAggregate.id]) return prev
          const next = { ...prev }
          delete next[activeAggregate.id]
          return next
        })
      })
      .catch((error) => {
        if (!active) return
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
    if (!activeAggregate || loadedCategoryId !== activeAggregate.id) return []
    if (!searchQuery.trim()) return assets
    const q = searchQuery.toLowerCase()
    return assets.filter(
      (item) => item.title_cn.toLowerCase().includes(q) || item.prompt_en.toLowerCase().includes(q),
    )
  }, [activeAggregate, assets, loadedCategoryId, searchQuery])

  const recipeIds = useMemo(() => new Set(recipeItems.map((r) => r.uuid)), [recipeItems])

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

  useEffect(() => {
    return () => {
      if (addPulseTimer.current !== null) {
        window.clearTimeout(addPulseTimer.current)
      }
      if (longPressTimer.current !== null) {
        window.clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  function triggerAddPulse(uuid: string) {
    setAddPulseId(uuid)
    if (addPulseTimer.current !== null) {
      window.clearTimeout(addPulseTimer.current)
    }
    addPulseTimer.current = window.setTimeout(() => {
      setAddPulseId((current) => (current === uuid ? null : current))
    }, 420)
  }

  function addAssetDirectly(asset: PromptAssetItem) {
    addRecipeItem(asset)
    triggerAddPulse(asset.uuid)
  }

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleAssetPressStart(asset: PromptAssetItem) {
    clearLongPressTimer()
    longPressTriggered.current = false
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      setSelectedAsset(asset)
    }, LONG_PRESS_MS)
  }

  function handleAssetPressEnd(asset: PromptAssetItem) {
    clearLongPressTimer()
    if (!longPressTriggered.current) {
      addAssetDirectly(asset)
    }
    longPressTriggered.current = false
  }

  function toggleRecipeItem(asset: PromptAssetItem) {
    if (recipeIds.has(asset.uuid)) {
      removeRecipeItem(asset.uuid)
      return
    }

    addAssetDirectly(asset)
  }

  function setSubForTop(top: string, sub: string | null) {
    setSelectedSubByTop((prev) => ({ ...prev, [top]: sub }))
  }

  function goTo(index: number) {
    if (index < 0 || index >= topFlow.length) return
    setDirection(index > resolvedStep ? 1 : -1)
    setCurrentStep(index)
  }

  function goPrev() {
    goTo(resolvedStep - 1)
  }

  function onTouchStart(e: React.TouchEvent) {
    dragStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!dragStart.current) return
    const dx = e.changedTouches[0].clientX - dragStart.current.x
    const dy = e.changedTouches[0].clientY - dragStart.current.y
    const dt = Date.now() - dragStart.current.time
    const velocity = Math.abs(dx) / dt
    dragStart.current = null

    if (Math.abs(dy) > Math.abs(dx) * 0.8) return

    if (Math.abs(dx) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY) {
      if (dx < 0 && resolvedStep < topFlow.length - 1) {
        goTo(resolvedStep + 1)
      } else if (dx > 0 && resolvedStep > 0) {
        goPrev()
      }
    }
  }

  if (manifestLoading) {
    return (
      <div className="rounded-2xl bg-(--card) p-4 text-sm text-(--muted-foreground)">
        正在加载分类数据...
      </div>
    )
  }

  if (manifestError) {
    return (
      <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{manifestError}</p>
        <p>请确认已执行 pnpm run datasets:prepare。</p>
      </div>
    )
  }

  if (topFlow.length === 0) {
    return (
      <div className="rounded-2xl bg-(--card) p-4 text-sm text-(--muted-foreground)">
        没有可用分类
      </div>
    )
  }

  const sub = selectedSubByTop[activeTopCategory] ?? null

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -48 : 48, opacity: 0 }),
  }
  const transition = { duration: 0.18, ease: 'easeOut' as const }

  return (
    <div className="-mx-4 -mt-6 flex flex-col" style={{ height: 'calc(100dvh - 80px)' }}>

      {/* ── 紧凑顶栏 ──────────────────────────────────────────── */}
      <div className="shrink-0 flex h-11 items-center gap-1 border-b border-(--border) bg-(--background) px-2">

        {/* 左：返回 */}
        <button
          type="button"
          onClick={goPrev}
          disabled={resolvedStep === 0}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-(--muted-foreground) transition hover:bg-(--muted) disabled:opacity-30"
          aria-label="上一步"
        >
          <ChevronLeft size={18} />
        </button>

        {/* 中：步骤名 + 进度点 */}
        <div className="flex flex-1 items-center gap-2 min-w-0 px-1">
          <span className="truncate text-sm font-semibold text-(--foreground)">
            {activeTopCategory}
          </span>
          <div className="flex items-center gap-1">
            {topFlow.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={topFlow[i]}
                className={[
                  'rounded-full transition',
                  i === resolvedStep
                    ? 'h-2 w-4 bg-(--primary)'
                    : 'h-1.5 w-1.5 bg-(--muted-foreground)/40 hover:bg-(--muted-foreground)/70',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        {/* 右：搜索 + 快速跳转 */}
        <button
          type="button"
          onClick={() => {
            setSearchOpen((v) => {
              if (v) setSearchQuery('')
              return !v
            })
          }}
          aria-label={searchOpen ? '关闭搜索' : '搜索'}
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition',
            searchOpen
              ? 'bg-(--primary) text-(--primary-foreground)'
              : 'text-(--muted-foreground) hover:bg-(--muted)',
          ].join(' ')}
        >
          {searchOpen ? <X size={15} /> : <Search size={15} />}
        </button>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="快速跳转分类"
            className={[
              'flex h-8 w-8 items-center justify-center rounded-full transition',
              menuOpen
                ? 'bg-(--primary) text-(--primary-foreground)'
                : 'text-(--muted-foreground) hover:bg-(--muted)',
            ].join(' ')}
          >
            <LayoutGrid size={14} />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-9 z-50 w-40 overflow-hidden rounded-xl border border-(--border) bg-(--card) shadow-lg">
              <p className="border-b border-(--border) px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-(--muted-foreground)">
                快速跳转
              </p>
              <div className="max-h-64 overflow-y-auto py-1">
                {topFlow.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { goTo(i); setMenuOpen(false) }}
                    className={[
                      'flex w-full items-center gap-2 px-3 py-2 text-xs transition',
                      i === resolvedStep
                        ? 'bg-(--primary)/10 font-medium text-(--primary)'
                        : 'text-(--foreground) hover:bg-(--muted)',
                    ].join(' ')}
                  >
                    <span className={[
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold',
                      i <= resolvedStep
                        ? 'bg-(--primary) text-(--primary-foreground)'
                        : 'bg-(--muted) text-(--muted-foreground)',
                    ].join(' ')}>
                      {i < resolvedStep ? '✓' : i + 1}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── 子类目横划 ─────────────────────────────────────────── */}
      {subCategories.length > 0 ? (
        <div className="hide-scrollbar shrink-0 flex items-center gap-1.5 overflow-x-auto border-b border-(--border) px-2 py-1.5">
          <button
            type="button"
            onClick={() => setSubForTop(activeTopCategory, null)}
            className={[
              'shrink-0 rounded-full border px-3 py-1 text-xs transition',
              sub === null
                ? 'border-(--primary) bg-(--primary) text-(--primary-foreground)'
                : 'border-(--border) bg-(--background) text-(--muted-foreground) hover:border-(--primary) hover:text-(--primary)',
            ].join(' ')}
          >
            全部
          </button>
          {subCategories.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubForTop(activeTopCategory, s)}
              className={[
                'shrink-0 rounded-full border px-3 py-1 text-xs transition',
                sub === s
                  ? 'border-(--primary) bg-(--primary) text-(--primary-foreground)'
                  : 'border-(--border) bg-(--background) text-(--muted-foreground) hover:border-(--primary) hover:text-(--primary)',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {/* ── 可折叠搜索框 ──────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {searchOpen ? (
          <motion.div
            key="searchbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="shrink-0 overflow-hidden bg-(--background)"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-(--muted) px-3 py-2">
                <Search size={14} className="shrink-0 text-(--muted-foreground)" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-(--muted-foreground)"
                />
                <AnimatePresence initial={false}>
                  {searchQuery ? (
                    <motion.button
                      key="clear"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.12 }}
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-(--muted-foreground)/20 text-(--muted-foreground) hover:bg-(--muted-foreground)/30"
                    >
                      <X size={10} />
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── 内容区（手势 + 虚拟网格）────────────────────────────── */}
      <div
        className="min-h-0 flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={resolvedStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            className="h-full will-change-transform"
          >
            {assetLoading ? (
              <div className="grid grid-cols-2 gap-3 overflow-y-auto p-3" style={{ height: '100%' }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="space-y-2">
                    <div className="aspect-square animate-pulse rounded-xl bg-(--muted)" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-(--muted)" />
                    <div className="h-7 w-full animate-pulse rounded-lg bg-(--muted)" />
                  </div>
                ))}
              </div>
            ) : assetError ? (
              <div className="m-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {assetError}
              </div>
            ) : visibleAssets.length === 0 ? (
              <div className="m-3 rounded-2xl bg-(--card) p-4 text-sm text-(--muted-foreground)">
                {t('noData')}
              </div>
            ) : (
              <VirtualAssetGrid
                assets={visibleAssets}
                recipeIds={recipeIds}
                addPulseId={addPulseId}
                onPressStart={handleAssetPressStart}
                onPressEnd={handleAssetPressEnd}
                onPressLeave={clearLongPressTimer}
                onToggle={toggleRecipeItem}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AssetDetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  )
}

