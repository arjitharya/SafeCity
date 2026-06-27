import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('theme')
      if (p === 'dark') return true
      if (p === 'light') return false
      return localStorage.getItem('safecity-theme') === 'dark'
    } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('safecity-theme', isDark ? 'dark' : 'light') }
    catch {}
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
