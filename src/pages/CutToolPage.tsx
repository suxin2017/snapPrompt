import { CutToolMobile } from '@/features/h5/CutToolMobile'
import { CutToolDesktop } from '@/features/pc/CutToolDesktop'

type CutToolPageProps = {
  terminal: 'h5' | 'pc'
}

export function CutToolPage({ terminal }: CutToolPageProps) {
  return terminal === 'pc' ? <CutToolDesktop /> : <CutToolMobile />
}
