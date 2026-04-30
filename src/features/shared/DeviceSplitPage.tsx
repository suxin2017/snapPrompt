import type { ReactNode } from 'react'

import { useIsMobile } from '@/hooks/useIsMobile'

type DeviceSplitPageProps = {
  h5: ReactNode
  pc: ReactNode
}

export function DeviceSplitPage({ h5, pc }: DeviceSplitPageProps) {
  const isMobile = useIsMobile()

  return (
    <section className="rounded-3xl border border-(--border) bg-(--card) p-4 shadow-sm md:p-8">
      <div className="mb-5 inline-flex items-center rounded-full bg-(--muted) px-3 py-1 text-xs uppercase tracking-[0.14em] text-(--muted-foreground)">
        {isMobile ? 'H5 View' : 'PC View'}
      </div>
      {isMobile ? h5 : pc}
    </section>
  )
}
