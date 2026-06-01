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
  const ref = useRef(null)
  const isSelecting = useRef(false) // Флаг: идет ли выбор элемента

  useEffect(() => {
    function handleClickOutside(event) {
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
      setOpen(matches.length > 0)
      setActive(0)
    },200)
    return ()=>clearTimeout(handle)
  },[value, normalized])

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
    
    // Закрываем и очищаем СРАЗУ
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
          onChange={e=>onChange && onChange(e.target.value)}
          onFocus={() => {
            // Открываем только если есть matches и не идет выбор
            if (matches.length > 0 && !isSelecting.current) {
              setOpen(true)
            }
          }}
          // УБРАЛИ onBlur чтобы не было конфликта с кликом
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