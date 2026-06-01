import React, { useState, useEffect, useRef } from 'react'

function highlight(text, q){
  if(!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if(idx === -1) return text
  return <>{text.slice(0,idx)}<span className="bg-yellow-100">{text.slice(idx, idx+q.length)}</span>{text.slice(idx+q.length)}</>
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Введите название объекта...',
  locations = [],
}){
  const normalized = locations.map(l => typeof l === 'string' ? { name: l, address: '' } : l)

  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState([])
  const [active, setActive] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const ref = useRef(null)
  const isSelecting = useRef(false) // Флаг: идет ли выбор элемента

  useEffect(() => {
    function handleClickOutside(event) {
      // Игнорируем клики по элементам, помеченным как игнорируемые для автокомплита (например, табы)
      try {
        if (event.target && event.target.closest && event.target.closest('[data-ignore-autocomplete="true"]')) {
          return
        }
      } catch (err) {
        // ignore
      }

      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(()=>{
    // Не обновляем список, если сейчас идет выбор элемента
    if (isSelecting.current) return
    
    const handle = setTimeout(()=>{
      const q = (value || '').trim().toLowerCase()
      if(!q){ 
        setMatches([])
        setOpen(false)
        return 
      }
      const m = normalized.filter(l=> l.name.toLowerCase().includes(q)).slice(0,20)
      setMatches(m)
      // Открываем список ТОЛЬКО если пользователь реально взаимодействует с полем (isFocused)
      if (m.length > 0 && isFocused) {
        setOpen(true)
      } else {
        setOpen(false)
      }
      setActive(0)
    },150)
    return ()=>clearTimeout(handle)
  },[value, normalized, isFocused])

  useEffect(()=>{
    function onKey(e){
      if(!open) return
      if(e.key === 'ArrowDown'){
        e.preventDefault()
        setActive(s=>Math.min(s+1,matches.length-1))
      } else if(e.key === 'ArrowUp'){
        e.preventDefault()
        setActive(s=>Math.max(s-1,0))
      } else if(e.key === 'Enter'){
        e.preventDefault()
        if(matches[active]) select(matches[active])
      } else if(e.key === 'Escape'){
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=>window.removeEventListener('keydown', onKey)
  },[open, matches, active])

  function select(item){
    isSelecting.current = true // Устанавливаем флаг

    if (onSelect) onSelect(item)

    // Сбрасываем фокус и закрываем
    setIsFocused(false)
    setOpen(false)
    setMatches([])
    setActive(0)

    // Сбрасываем флаг через небольшую задержку
    setTimeout(() => {
      isSelecting.current = false
    }, 300)
  }

  return (
    <div className="relative max-w-xl mx-auto" ref={ref}>
      <div className="flex items-center bg-white px-3 py-2 rounded shadow">
        <input
          value={value}
          onChange={e=>{ setIsFocused(true); onChange && onChange(e.target.value) }}
          onClick={() => { if (matches.length > 0 && !isSelecting.current) setOpen(true) }}
          onFocus={() => { setIsFocused(true); if (matches.length > 0) setOpen(true) }}
          onBlur={() => {
            // Небольшая задержка чтобы успеть обработать клик по элементу списка
            setTimeout(() => {
              setIsFocused(false)
              setOpen(false)
            }, 150)
          }}
          placeholder={placeholder}
          className="flex-1 outline-none"
        />
        {value && (
          <button 
            onClick={() => {
              onChange && onChange('')
              setOpen(false)
              setMatches([])
            }} 
            className="text-gray-500 px-2 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white border rounded shadow max-h-64 overflow-auto z-50">
          <div className="px-3 py-2 text-sm text-gray-600">Найдено: {matches.length} объектов</div>
          {matches.map((m,i)=> (
            <div 
              key={m.name + i} 
              onClick={() => select(m)}
              onMouseDown={(e) => e.preventDefault()} // Предотвращаем потерю фокуса
              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${i===active? 'bg-gray-100':''}`}
            >
              <div>{highlight(m.name, value)}</div>
              {m.address && <div className="text-xs text-gray-500">{m.address}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}