import { useEffect } from 'react'

import { analytics } from '@utils/analytics'

export function useAnalytics(
  category: string,
  action: string = '',
  label: string = '',
  nonInteraction: boolean = false,
) {
  useEffect(() => {
    analytics(category, action, label, nonInteraction)
  }, [category, action, label, nonInteraction])
}
