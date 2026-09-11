import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it } from 'vitest'
import App from './App'

beforeEach(() => {
  window.location.hash = ''
})

it('opens on the timer view', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Timer' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Timer' })).toHaveAttribute('aria-current', 'page')
})

it('navigates between views', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('link', { name: 'History' }))
  expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()

  await user.click(screen.getByRole('link', { name: 'Insights' }))
  expect(await screen.findByRole('heading', { name: 'Insights' })).toBeInTheDocument()
  expect(document.title).toBe('Insights | where did my time go?')
})

it('switches views with number keys', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.keyboard('2')
  expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()

  await user.keyboard('3')
  expect(await screen.findByRole('heading', { name: 'Insights' })).toBeInTheDocument()

  await user.keyboard('4')
  expect(await screen.findByRole('heading', { name: 'Data', level: 1 })).toBeInTheDocument()

  await user.keyboard('1')
  expect(await screen.findByRole('heading', { name: 'Timer' })).toBeInTheDocument()
})

it('opens the view named in the URL', () => {
  window.location.hash = '#/history'
  render(<App />)
  expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument()
})
