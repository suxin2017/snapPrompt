import { useEffect, useMemo, useState } from 'react'
import { Database, FolderTree, Image as ImageIcon, PackageOpen } from 'lucide-react'

import { fetchDatasetIndex, type CategoryManifestItem, type DatasetManifestItem } from '@/lib/promptDatasets'

export function AboutMobile() {
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

  const stats = useMemo(
    () => [
      {
        label: '源数据包',
        value: datasets.length,
        icon: PackageOpen,
      },
      {
        label: '分类聚合',
        value: categories.length,
        icon: FolderTree,
      },
      {
        label: '图片素材',
        value: datasets.reduce((sum, item) => sum + item.itemCount, 0),
        icon: ImageIcon,
      },
      {
        label: '请求模型',
        value: '分类 JSON',
        icon: Database,
      },
    ],
    [categories, datasets],
  )

  return (
    <div className="space-y-6 pb-36">
      <section className="rounded-3xl border border-(--border) bg-(--card) p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-(--muted-foreground)">About snapPrompt</p>
        <h2 className="mt-2 text-2xl font-semibold">面向移动端的 AI 摄影 Prompt 积木台</h2>
        <p className="mt-3 text-sm leading-6 text-(--muted-foreground)">
          数据源来自 assets 目录下的 zip 包，但 H5 运行时不直接解压 zip。构建阶段先把素材解包成图片和结构化 JSON，前端只做分类请求、懒加载和配方拼装。
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-(--border) bg-(--card) p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <Icon size={16} className="text-[var(--primary)]" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-3xl border border-(--border) bg-(--card) p-4 shadow-sm">
        <h3 className="text-base font-semibold">当前方案的关键约束</h3>
        <div className="space-y-3 text-sm leading-6 text-(--muted-foreground)">
          <div className="rounded-2xl bg-(--background) p-3">
            zip 仅用于源数据管理，浏览器端不做运行时解压，避免把解析成本压给移动设备。
          </div>
          <div className="rounded-2xl bg-(--background) p-3">
            每个分类提供一个聚合 JSON，减少 H5 页面切换时的并发请求数量。
          </div>
          <div className="rounded-2xl bg-(--background) p-3">
            主体输入和配方列表挂在共享 Context 上，首页、积木页、底部栏可以持续协同。
          </div>
        </div>
      </section>
    </div>
  )
}
