// @ts-check
import * as React from 'react'

import { SimplifiedRouteTile } from './SimplifiedRouteTile'

/**
 * Enhanced route tile that supports both old and new route display modes
 * @param {import("@rm/types").Route} route
 */
export function EnhancedRouteTile(route) {
  // Use the SimplifiedRouteTile approach which works with the individual route processing
  return <SimplifiedRouteTile routes={[route]} />
}
