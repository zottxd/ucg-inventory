import React, { useEffect } from 'react'

export default function Header({ user, userRole, onLogout }){
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Cache-Control'
    meta.content = 'no-cache, no-store, must-revalidate'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <header className="bg-white border-b px-4 md:px-8 py-3" style={{borderColor:'#e6e9ec'}}>
      <div className="max-w-[1200px] mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/img/Логотип в шапке.svg" alt="UCG INVENTORY" className="h-10" />
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <nav className="flex flex-wrap gap-2 md:gap-4 text-sm">
            <a href="#/" className="px-2 md:px-4 py-1 text-gray-700 hover:text-ucg-dark">КАТАЛОГ</a>
            {userRole === 'admin' && (
              <a href="#/admin" className="px-2 md:px-4 py-1 text-gray-700 hover:text-ucg-dark">АДМИН</a>
            )}
          </nav>

          {user && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <span className="text-sm text-gray-600 truncate">{user.email}</span>
              <button
                onClick={onLogout}
                className="px-2 md:px-4 py-1 border rounded text-sm text-slate-700 bg-white hover:bg-slate-50"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
