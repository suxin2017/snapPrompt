import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers3, Sparkles, Boxes, ArrowRight } from 'lucide-react'

import { useH5Recipe } from '@/contexts/h5RecipeContext'
import { fetchDatasetIndex, type CategoryManifestItem, type DatasetManifestItem } from '@/lib/promptDatasets'

export function FeaturesMobile() {
  const { subject, recipeItems } = useH5Recipe()
  const [categories, setCategories] = useState<CategoryManifestItem[]>([])
  const [datasets, setDatasets] = useState<DatasetManifestItem[]>([])

  useEffect(() => {
    fetchDatasetIndex()
      .then((index) => {
        setCategories(index.categories)
        setDatasets(index.items)
      })
      .catch(() => {
        setCategories([])
        setDatasets([])
      })
  }, [])

  const totalAssets = useMemo(
    () => categories.filter((item) => !item.subCategory).reduce((sum, item) => sum + item.itemCount, 0),
    [categories],
  )

  const featureCards = [
    {
      title: '主体先行',
      text: subject.trim() ? `当前主体：${subject}` : '先输入拍摄主体，再去拼装风格积木。',
      icon: Sparkles,
    },
    {
      title: '分类懒加载',
      text: `当前共 ${categories.length} 个分类聚合入口，H5 按分类请求。`,
      icon: Boxes,
    },
    {
      title: '配方随页保留',
      text: `已加入 ${recipeItems.length} 个积木，切页后仍可继续编辑。`,
      icon: Layers3,
    },
  ]

  const workflow = [
    '输入拍摄主体，先确定人物、场景或氛围。',
    '进入积木页按分类浏览，逐个加入合适素材。',
    '在底部配方栏检查结果并生成最终 Prompt。',
  ]

  return (
    <div className="space-y-6 pb-36">
      <section className="overflow-hidden rounded-3xl border border-(--border) bg-linear-to-br from-(--card) to-(--muted) p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-(--muted-foreground)">Feature Map</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight">把主体、分类积木和 Prompt 输出串成一条移动端工作流</h2>
        <p className="mt-2 text-sm leading-6 text-(--muted-foreground)">
          当前 H5 不是单页海报，而是一套可持续拼装的 Prompt Builder。输入主体后，选择积木并在底部直接生成可复制结果。
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-(--border) bg-(--card) p-3 shadow-sm">
          <p className="text-xs text-(--muted-foreground)">数据包</p>
          <p className="mt-2 text-2xl font-semibold">{datasets.length}</p>
        </div>
        <div className="rounded-2xl border border-(--border) bg-(--card) p-3 shadow-sm">
          <p className="text-xs text-(--muted-foreground)">分类入口</p>
          <p className="mt-2 text-2xl font-semibold">{categories.length}</p>
        </div>
        <div className="rounded-2xl border border-(--border) bg-(--card) p-3 shadow-sm">
          <p className="text-xs text-(--muted-foreground)">可用积木</p>
          <p className="mt-2 text-2xl font-semibold">{totalAssets}</p>
        </div>
      </section>

      <section className="space-y-3">
        {featureCards.map(({ title, text, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-(--border) bg-(--card) p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-(--muted) p-2.5 text-[var(--primary)]">
                <Icon size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-(--muted-foreground)">{text}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-(--border) bg-(--card) p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">三步完成一次拼装</h3>
          <Link to="/m/cut-tool" className="text-xs text-[var(--primary)]">
            现在开始
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {workflow.map((item, index) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl bg-(--background) p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--secondary) text-xs font-semibold text-(--foreground)">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-(--muted-foreground)">{item}</p>
            </div>
          ))}
        </div>
        <Link
          to="/m/cut-tool"
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-medium text-[var(--primary-foreground)]"
        >
          去拼装积木
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  )
}
