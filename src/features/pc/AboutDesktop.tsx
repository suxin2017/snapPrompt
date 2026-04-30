export function AboutDesktop() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-semibold">桌面端关于页</h2>
      <p className="max-w-3xl text-(--muted-foreground)">
        目录按 shared、h5、pc 分层，既能共享公共逻辑，也能保持端侧实现独立演进。
      </p>
    </div>
  )
}
