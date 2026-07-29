import React, { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

export function getInitialTheme(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch (err) {
    // ignore localStorage read failures
  }
  if (typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function applyTheme(theme){
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export default function ThemeToggle(){
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = () => setTheme(prev => {
    const next = prev === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch (err) {
      // ignore localStorage write failures
    }
    return next
  })

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-lg transition-all duration-300 hover:scale-110 hover:bg-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}
