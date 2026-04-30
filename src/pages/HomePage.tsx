import { HomeMobile } from '@/features/h5/HomeMobile'
import { HomeDesktop } from '@/features/pc/HomeDesktop'

type HomePageProps = {
  terminal: 'h5' | 'pc'
}

export function HomePage({ terminal }: HomePageProps) {
  return terminal === 'h5' ? <HomeMobile /> : <HomeDesktop />
}
