import React from 'react'

export default function Sidebar({ active = 'objects', onAdd }){
  return (
    <aside className="ucg-sidebar text-white w-64 p-6 flex flex-col gap-4 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">U</div>
          <div>
            <h1 className="text-lg font-semibold">UCG Assets</h1>
            <div className="text-sm text-white/70">Инвентарь</div>
          </div>
        </div>
      </div>

      <nav className="flex-1">
        <button className={`w-full text-left px-4 py-3 rounded ${active === 'objects' ? 'ucg-active' : 'hover:bg-white/5'}`}>ОБЪЕКТЫ</button>
      </nav>

      <div>
        <button onClick={onAdd} className="w-full ucg-btn-accent text-white px-4 py-2 rounded flex items-center justify-center gap-2">Добавить объект</button>
      </div>
    </aside>
  )
}
