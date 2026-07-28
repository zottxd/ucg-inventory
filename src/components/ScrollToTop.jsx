import React, { useEffect, useState } from 'react'

export default function ScrollToTop(){
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Наверх"
      title="Наверх"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-[30px] right-[30px] z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl text-white shadow-lg transition-opacity duration-300 hover:bg-slate-700 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      ↑
    </button>
  )
}
