export function FeaturesMobile() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold leading-tight">移动端功能页</h2>
      <ul className="space-y-3 text-sm text-(--muted-foreground)">
        <li className="rounded-xl bg-(--muted) p-3">手势优先的内容卡片排序</li>
        <li className="rounded-xl bg-(--muted) p-3">分步式表单，降低单屏输入负担</li>
        <li className="rounded-xl bg-(--muted) p-3">网络弱场景的渐进加载反馈</li>
      </ul>
    </div>
  )
}
