import React, { useState, useEffect } from 'react'

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false)

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  return (
    <div className="fixed bottom-8 right-8 z-40">
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="w-12 h-12 rounded-full bg-blue-900 text-white shadow-lg flex items-center justify-center hover:bg-blue-800 hover:scale-110 transition-all duration-300"
          title="Вверх"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default ScrollToTop
