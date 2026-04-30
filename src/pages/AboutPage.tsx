import { AboutMobile } from '@/features/h5/AboutMobile'
import { AboutDesktop } from '@/features/pc/AboutDesktop'

type AboutPageProps = {
  terminal: 'h5' | 'pc'
}

export function AboutPage({ terminal }: AboutPageProps) {
  return terminal === 'h5' ? <AboutMobile /> : <AboutDesktop />
}
