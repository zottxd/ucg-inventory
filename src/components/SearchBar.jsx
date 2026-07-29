import React from 'react'

export default function SearchBar({ value, onChange }){
  return (
    <div className="p-6">
      <input
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder="Поиск актива (например, DVINTSEV)..."
        className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-ucg-accent"
      />
    </div>
  )
}
