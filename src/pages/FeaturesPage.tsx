import { FeaturesMobile } from '@/features/h5/FeaturesMobile'
import { FeaturesDesktop } from '@/features/pc/FeaturesDesktop'

type FeaturesPageProps = {
  terminal: 'h5' | 'pc'
}

export function FeaturesPage({ terminal }: FeaturesPageProps) {
  return terminal === 'h5' ? <FeaturesMobile /> : <FeaturesDesktop />
}
