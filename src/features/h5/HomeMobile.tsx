import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'

import { useH5Recipe } from '@/contexts/h5RecipeContext'
import { fetchDatasetIndex, type CategoryManifestItem } from '@/lib/promptDatasets'

const SUGGESTIONS = ['街道夜景', '咖啡馆下午茶', '海边黄昏', '城市雨天', '森林晨光', '复古胶片感']

const CATEGORY_EMOJI: Record<string, string> = {
  上衣: '👕',
  下装: '👖',
  裙装: '👗',
  外套: '🧥',
  鞋子: '👟',
  包包: '👜',
  配饰: '💍',
}

function getCategoryEmoji(name: string) {
  return CATEGORY_EMOJI[name] ?? name.charAt(0)
}

export function HomeMobile() {
  const { subject, setSubject } = useH5Recipe()
  const [categories, setCategories] = useState<CategoryManifestItem[]>([])
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDatasetIndex()
      .then((index) => setCategories(index.categories))
      .catch(() => { /* manifest not ready */ })
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % SUGGESTIONS.length)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [])

  const topCategories = useMemo(
    () => categories.filter((c) => !c.subCategory),
    [categories],
  )

  const currentSuggestion = SUGGESTIONS[suggestionIndex]

  function applySuggestion() {
    setSubject(currentSuggestion ?? '')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-6 pb-36">
      {/* 拍摄主体 */}
      <section className="space-y-3 rounded-3xl border border-(--border) bg-(--card) p-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-semibold">拍摄主体</h2>
          <span className="text-xs text-(--muted-foreground)">描述你想拍摄的场景或人物</span>
        </div>
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="例如：一个女生在咖啡店看书"
            className="w-full rounded-xl border border-(--border) bg-(--background) px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
          {subject ? (
            <button
              type="button"
              onClick={() => { setSubject(''); inputRef.current?.focus() }}
              className="absolute right-3 text-(--muted-foreground) hover:text-(--foreground)"
              aria-label="清空"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        {currentSuggestion ? (
          <button
            type="button"
            onClick={applySuggestion}
            className="flex items-center gap-1.5 rounded-full bg-(--muted) px-3 py-1.5 text-xs text-(--muted-foreground) transition hover:bg-(--secondary)"
          >
            <Sparkles size={12} className="text-[var(--primary)]" />
            试试：{currentSuggestion}
          </button>
        ) : null}
      </section>

      {/* 推荐配方 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">推荐配方</h2>
          <Link to="/m/cut-tool" className="text-xs text-[var(--primary)]">
            查看全部 ›
          </Link>
        </div>
        {topCategories.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {topCategories.map((cat) => (
              <Link
                key={cat.id}
                to="/m/cut-tool"
                className="shrink-0 w-28 overflow-hidden rounded-2xl border border-(--border) bg-(--card) shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-20 items-center justify-center bg-(--muted) text-4xl">
                  {getCategoryEmoji(cat.topCategory)}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-sm font-medium">{cat.topCategory}</p>
                  <p className="text-xs text-(--muted-foreground)">{cat.itemCount} 个积木</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-(--muted) p-4 text-sm text-(--muted-foreground)">
            暂无数据，请先运行{' '}
            <code className="rounded bg-(--secondary) px-1 py-0.5 text-xs">pnpm run datasets:prepare</code>
          </p>
        )}
      </section>

      {/* 灵感 */}
      {topCategories.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">灵感</h2>
            <Link to="/m/cut-tool" className="text-xs text-[var(--primary)]">更多 ›</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {topCategories.slice(0, 4).map((cat) => (
              <Link
                key={cat.id}
                to="/m/cut-tool"
                className="overflow-hidden rounded-2xl border border-(--border) bg-(--card) shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-24 items-center justify-center bg-(--muted) text-5xl">
                  {getCategoryEmoji(cat.topCategory)}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium">{cat.topCategory}</p>
                  <p className="text-xs text-(--muted-foreground)">{cat.datasetCount} 个数据包</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
