import { useEffect } from 'react'

const DEFAULT_THEME_COLOR = '#f4efe7'

const routeThemeColors: Record<string, string> = {
  '/m/cut-tool': '#f4efe7',
  '/pc': '#f4efe7',
  '/pc/cut-tool': '#f4efe7',
  '/pc/features': '#efe2cc',
  '/pc/about': '#f4efe7',
  '/pc/blocks-preview': '#f4efe7',
}

function getThemeColor(pathname: string) {
  return routeThemeColors[pathname] ?? DEFAULT_THEME_COLOR
}

export function useThemeColor(pathname: string) {
  useEffect(() => {
    const color = getThemeColor(pathname)
    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')

    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', color)
    }
  }, [pathname])
}
