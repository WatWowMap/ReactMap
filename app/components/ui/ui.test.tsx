import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render, within } from '@testing-library/react'
import { setupDom, teardownDom } from '../../test-setup'
import { Button } from './button'
import { Card, CardContent } from './card'

beforeAll(setupDom)
afterAll(teardownDom)

afterEach(cleanup)

test('renders a button that carries a token reference, not a hardcoded colour', () => {
  const { container } = render(<Button>Go</Button>)
  const button = within(container).getByRole('button', { name: 'Go' })
  expect(button).toBeTruthy()
  expect(button.className).toContain('bg-primary')
  expect(button.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
})

test('renders a card', () => {
  const { container } = render(
    <Card>
      <CardContent>Nearby raids</CardContent>
    </Card>,
  )
  expect(within(container).getByText('Nearby raids')).toBeTruthy()
})
