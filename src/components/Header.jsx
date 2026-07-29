import React, { useEffect, useState } from 'react'
import ThemeToggle from './ThemeToggle'

const navBase = 'px-2 md:px-4 py-1 rounded transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-100 dark:hover:bg-slate-800'

export default function Header({ user, userRole, onLogout }){
  const [hash, setHash] = useState(() => window.location.hash || '#/')

  useEffect(() => {
    const handleHash = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  const isAdminPage = hash === '#/admin'
  const linkClass = (active) => `${navBase} ${active ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Cache-Control'
    meta.content = 'no-cache, no-store, must-revalidate'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <header className="bg-white text-gray-900 border-b border-gray-200 px-4 md:px-8 py-3 dark:bg-slate-900 dark:text-white dark:border-slate-700">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <a
          href="#/"
          className="flex cursor-pointer items-center gap-3 text-blue-600 transition-transform duration-300 hover:scale-105 dark:text-blue-400"
        >
          <img src="/img/Логотип в шапке.svg" alt="UCG INVENTORY" className="h-10" />
        </a>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <nav className="flex flex-wrap gap-2 md:gap-4 text-sm">
            <a href="#/" className={linkClass(!isAdminPage)}>КАТАЛОГ</a>
            {userRole === 'admin' && (
              <a href="#/admin" className={linkClass(isAdminPage)}>АДМИН</a>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <span className="text-sm text-gray-600 truncate dark:text-gray-400">{user.email}</span>
                <button
                  onClick={onLogout}
                  className="px-2 md:px-4 py-1 border border-gray-200 rounded text-sm text-slate-700 bg-white transition-all duration-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
