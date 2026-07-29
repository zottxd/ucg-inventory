import React from 'react'

export default function ScrollToTop(){
  const scrollUp = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Наверх"
      title="Наверх"
      className="fixed bottom-[30px] right-[30px] z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-slate-700"
    >
      ↑
    </button>
  )
}
