import React, { useEffect, useState } from 'react'
import PrivacyPolicyModal from './PrivacyPolicyModal'

const CONSENT_KEY = 'cookieConsent'

function hasConsent(){
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true'
  } catch (err) {
    return false
  }
}

export default function CookieConsent(){
  const [visible, setVisible] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  useEffect(() => {
    setVisible(!hasConsent())
  }, [])

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'true')
    } catch (err) {
      // ignore localStorage write failures
    }
    setVisible(false)
  }

  return (
    <>
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-slate-900/95 px-4 py-4 text-white shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/90">
              Продолжая использовать сайт, вы соглашаетесь с обработкой персональных данных, собираемых
              посредством метрической программы Яндекс.Метрика, в целях аналитики посещаемости сайта.{' '}
              <button
                type="button"
                onClick={() => setShowPolicy(true)}
                className="underline underline-offset-2 hover:text-white"
              >
                Политика конфиденциальности
              </button>
              .
            </p>
            <button
              type="button"
              onClick={accept}
              className="shrink-0 rounded bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200"
            >
              Хорошо, я согласен
            </button>
          </div>
        </div>
      )}

      <PrivacyPolicyModal open={showPolicy} onClose={() => setShowPolicy(false)} />
    </>
  )
}
