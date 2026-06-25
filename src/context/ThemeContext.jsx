import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('gsv-admin-theme') === 'dark' }
    catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem('gsv-admin-theme', isDark ? 'dark' : 'light') }
    catch {}
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(p => !p) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
