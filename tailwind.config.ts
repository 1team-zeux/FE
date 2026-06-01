import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'var(--color-brand)',
        'brand-light': 'var(--color-brand-light)',
        'brand-subtle': 'var(--color-brand-subtle)',
        'bg-page': 'var(--color-bg-page)',
        'bg-card': 'var(--color-bg-card)',
        'bg-muted': 'var(--color-bg-muted)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'status-critical': 'var(--color-status-critical)',
        'status-warning': 'var(--color-status-warning)',
        'status-ok': 'var(--color-status-ok)',
        'status-pending': 'var(--color-status-pending)',
      },
    },
  },
  plugins: [],
} satisfies Config
