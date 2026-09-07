import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('ホーム画面が表示される', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'ホーム' })).toBeInTheDocument()
    expect(screen.getByText(/今月の利益/)).toBeInTheDocument()
  })
})
