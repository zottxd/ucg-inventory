import React, { useEffect, useState } from 'react'
import PrivacyPolicyModal from './PrivacyPolicyModal'

const STORAGE_KEY = 'cookieConsent'

export default function CookieConsent(){
  const [show, setShow] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)

  useEffect(() => {
    try {
      setShow(localStorage.getItem(STORAGE_KEY) !== 'true')
    } catch (err) {
      setShow(true)
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch (err) {
      // ignore localStorage write failures
    }
    setShow(false)
  }

  return (
    <>
      {show && (
      <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white/90 shadow-lg backdrop-blur transition-all duration-300 dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Продолжая использовать сайт, вы соглашаетесь с обработкой персональных данных
            в целях аналитики.{' '}
            <button
              type="button"
              onClick={() => setPolicyOpen(true)}
              className="text-blue-600 underline transition-all duration-300 hover:text-blue-700 dark:text-blue-400"
            >
              Политика конфиденциальности
            </button>
          </p>
          <button
            type="button"
            onClick={accept}
            className="shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-blue-700"
          >
            Хорошо, я согласен
          </button>
        </div>
      </div>
      )}
      <PrivacyPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </>
  )
}
