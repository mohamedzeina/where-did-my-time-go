import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearNotice } from '../app/notice'

afterEach(() => {
  cleanup()
  // The notice is app-wide state; don't let one test's message show up in the next.
  clearNotice()
})
