export function AboutMobile() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">移动端关于页</h2>
      <p className="text-sm text-(--muted-foreground)">
        该项目展示同一路由下按设备渲染不同组件的工程分层方式，保证 URL 统一。
      </p>
    </div>
  )
}
