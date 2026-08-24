import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/*
 * Upstream reads the theme from next-themes. This project has exactly one
 * dark mechanism, the prefers-color-scheme query in styles.css, and nothing
 * mounts a next-themes provider, so useTheme() here would return its default
 * on every render while adding a second, competing source of truth for what
 * dark means. Sonner's own "system" resolves against prefers-color-scheme,
 * which is the same signal the stylesheet uses.
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="system"
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      warning: <TriangleAlertIcon className="size-4" />,
      error: <OctagonXIcon className="size-4" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    }}
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
        '--border-radius': 'var(--radius)',
      } as React.CSSProperties
    }
    toastOptions={{
      classNames: {
        toast: 'cn-toast',
      },
    }}
    {...props}
  />
)

export { Toaster }
