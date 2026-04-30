export function HomeDesktop() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold">桌面端首页</h2>
      <p className="max-w-2xl text-(--muted-foreground)">
        桌面端可承载更大信息密度，适合双栏布局、数据看板和批量操作区。
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-(--muted) p-5">左侧概览面板</div>
        <div className="rounded-2xl bg-(--muted) p-5">右侧任务流</div>
      </div>
    </div>
  )
}
