import { useMemo, useState } from 'react'
import { Search, X, Clock } from 'lucide-react'
import type { DatasetManifestItem, FlatCategory } from '@/lib/promptDatasets'
import { getFlatCategories } from '@/lib/promptDatasets'

const RECENT_KEY = 'snapprompt_recent_categories'
const RECENT_MAX = 5

function loadRecent(): FlatCategory[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as FlatCategory[]) : []
  } catch {
    return []
  }
}

function saveRecent(cat: FlatCategory) {
  const prev = loadRecent().filter((c) => c.label !== cat.label)
  const next = [cat, ...prev].slice(0, RECENT_MAX)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

interface CategoryPickerProps {
  manifest: DatasetManifestItem[]
  selectedTop: string
  selectedSub: string | null
  onSelect: (top: string, sub: string | null) => void
}

export function CategoryPicker({ manifest, selectedTop, selectedSub, onSelect }: CategoryPickerProps) {
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState<FlatCategory[]>(loadRecent)

  const allFlat = useMemo(() => getFlatCategories(manifest), [manifest])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allFlat
    return allFlat.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.top.toLowerCase().includes(q) ||
        (c.sub?.toLowerCase().includes(q) ?? false),
    )
  }, [allFlat, query])

  // Group by top category for display
  const grouped = useMemo(() => {
    const map = new Map<string, FlatCategory[]>()
    for (const cat of filtered) {
      const list = map.get(cat.top) ?? []
      list.push(cat)
      map.set(cat.top, list)
    }
    return map
  }, [filtered])

  const currentLabel = selectedSub ? `${selectedTop} / ${selectedSub}` : selectedTop

  function handleSelect(cat: FlatCategory) {
    saveRecent(cat)
    setRecents(loadRecent())
    onSelect(cat.top, cat.sub)
  }

  function isActive(cat: FlatCategory) {
    return cat.top === selectedTop && cat.sub === selectedSub
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 当前选择 */}
      {currentLabel ? (
        <div className="flex items-center gap-2 rounded-xl bg-(--primary) px-3 py-2">
          <span className="flex-1 text-sm font-medium text-(--primary-foreground)">{currentLabel}</span>
          <button
            type="button"
            onClick={() => onSelect('', null)}
            className="text-(--primary-foreground)/70 hover:text-(--primary-foreground)"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* 搜索框 */}
      <div className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--background) px-3 py-2">
        <Search size={15} className="shrink-0 text-(--muted-foreground)" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索分类..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-(--muted-foreground)"
        />
        {query ? (
          <button type="button" onClick={() => setQuery('')}>
            <X size={14} className="text-(--muted-foreground)" />
          </button>
        ) : null}
      </div>

      {/* 最近使用（仅搜索为空时显示） */}
      {!query && recents.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-(--muted-foreground)">
            <Clock size={12} />
            <span>最近使用</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recents.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => handleSelect(cat)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs transition',
                  isActive(cat)
                    ? 'border-(--primary) bg-(--primary) text-(--primary-foreground)'
                    : 'border-(--border) bg-(--background) text-(--muted-foreground) hover:border-(--primary) hover:text-(--primary)',
                ].join(' ')}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 分类列表（按一级分组） */}
      <div className="space-y-3 overflow-y-auto">
        {[...grouped.entries()].map(([top, cats]) => (
          <div key={top} className="space-y-1.5">
            <p className="text-xs font-semibold text-(--muted-foreground)">{top}</p>
            <div className="flex flex-wrap gap-2">
              {/* 一级整体（全选该 top，sub=null） */}
              {cats.some((c) => c.sub !== null) ? (
                <button
                  type="button"
                  onClick={() => handleSelect({ top, sub: null, label: top })}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs transition',
                    selectedTop === top && selectedSub === null
                      ? 'border-(--primary) bg-(--primary) text-(--primary-foreground)'
                      : 'border-(--border) bg-(--background) text-(--muted-foreground) hover:border-(--primary) hover:text-(--primary)',
                  ].join(' ')}
                >
                  全部 {top}
                </button>
              ) : null}
              {/* 各子分类 */}
              {cats
                .filter((c) => c.sub !== null)
                .map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => handleSelect(cat)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-xs transition',
                      isActive(cat)
                        ? 'border-(--primary) bg-(--primary) text-(--primary-foreground)'
                        : 'border-(--border) bg-(--background) text-(--muted-foreground) hover:border-(--primary) hover:text-(--primary)',
                    ].join(' ')}
                  >
                    {cat.sub}
                  </button>
                ))}
              {/* 若无子分类，直接作为最终项 */}
              {cats.every((c) => c.sub === null) ? (
                <button
                  key={top}
                  type="button"
                  onClick={() => handleSelect({ top, sub: null, label: top })}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs transition',
                    selectedTop === top && selectedSub === null
                      ? 'border-(--primary) bg-(--primary) text-(--primary-foreground)'
                      : 'border-(--border) bg-(--background) text-(--muted-foreground) hover:border-(--primary) hover:text-(--primary)',
                  ].join(' ')}
                >
                  {top}
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-(--muted-foreground)">无匹配分类</p>
        ) : null}
      </div>
    </div>
  )
}
