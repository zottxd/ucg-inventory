import React from 'react'

export default function Header({ user, userRole, onLogout }){
  return (
    <header className="bg-white border-b" style={{borderColor:'#e6e9ec'}}>
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold" style={{color:'#1A2B49'}}>UCG</div>
          <div className="text-sm text-gray-600">| Inventory</div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <nav className="flex items-center gap-6 text-sm">
            <a href="#/" className="text-gray-700 hover:text-ucg-dark">КАТАЛОГ</a>
            {userRole === 'admin' && (
              <a href="#/admin" className="text-gray-700 hover:text-ucg-dark">АДМИН</a>
            )}
          </nav>

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
              <button
                onClick={onLogout}
                className="rounded border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
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
