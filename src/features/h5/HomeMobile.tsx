export function HomeMobile() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold leading-tight">移动端首页</h2>
      <p className="text-sm text-(--muted-foreground)">
        这里放 H5 专属内容，比如更紧凑的卡片布局、手势交互入口、底部浮层导航。
      </p>
      <div className="grid gap-3">
        <div className="rounded-2xl bg-(--muted) p-4">单列推荐区</div>
        <div className="rounded-2xl bg-(--muted) p-4">快捷操作区</div>
      </div>
    </div>
  )
}
