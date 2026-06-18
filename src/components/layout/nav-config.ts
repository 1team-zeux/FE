export interface NavItem {
  label: string
  to: string
  match: string
  icon: string
  hasChevron?: boolean
  adminOnly?: boolean
}

export interface BottomNavItem {
  label: string
  to: string
  icon: string
}

/** Pick the most specific nav prefix for the current path (avoids /dashboard matching /dashboard/finops). */
export function resolveNavMatch(path: string, candidates: string[]): string | null {
  const normalized = path.replace(/\/$/, '') || '/'
  const matching = candidates.filter((prefix) => {
    if (normalized === prefix) return true
    return normalized.startsWith(`${prefix}/`)
  })
  if (!matching.length) return null
  return matching.reduce((best, current) => (current.length > best.length ? current : best))
}

export function isNavMatchActive(path: string, match: string, candidates: string[]): boolean {
  return resolveNavMatch(path, candidates) === match
}

export const topTabs: NavItem[] = [
  {
    label: 'IaC 온보딩', match: '/iac', to: '/iac/document-upload',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>`,
  },
  {
    label: '모니터링', match: '/dashboard', to: '/dashboard',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`,
  },
]

export const mainNav: NavItem[] = [
  {
    label: 'IaC 온보딩', match: '/iac', to: '/iac/document-upload', hasChevron: true,
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>`,
  },
  {
    label: 'Overview', match: '/dashboard', to: '/dashboard', hasChevron: false,
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`,
  },
  {
    label: '비용 절감', match: '/dashboard/finops', to: '/dashboard/finops', hasChevron: false,
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
  },
  {
    label: '고객사 관리', match: '/admin/customers', to: '/admin/customers', hasChevron: false, adminOnly: true,
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>`,
  },
]

export const bottomNav: BottomNavItem[] = [
  {
    label: '설정', to: '/settings',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`,
  },
  {
    label: '알림 내역', to: '/notifications',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>`,
  },
]
