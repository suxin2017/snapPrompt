export function FeaturesDesktop() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">桌面端功能页</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-(--muted) p-4">
          <h3 className="text-lg font-medium">批量编辑</h3>
          <p className="mt-2 text-sm text-(--muted-foreground)">适合键盘与鼠标快速操作。</p>
        </article>
        <article className="rounded-2xl bg-(--muted) p-4">
          <h3 className="text-lg font-medium">横向对比</h3>
          <p className="mt-2 text-sm text-(--muted-foreground)">多栏可视化比对，提升决策效率。</p>
        </article>
        <article className="rounded-2xl bg-(--muted) p-4">
          <h3 className="text-lg font-medium">高级筛选</h3>
          <p className="mt-2 text-sm text-(--muted-foreground)">用于复杂业务条件组合。</p>
        </article>
      </div>
    </div>
  )
}
