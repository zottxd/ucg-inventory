import React, { useEffect } from 'react'

export default function PrivacyPolicyModal({ open, onClose }){
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Политика конфиденциальности"
        className="relative z-10 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-900">Политика конфиденциальности</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded p-1 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-700">
          <section>
            <h3 className="font-semibold text-slate-900">Какие данные мы собираем</h3>
            <p>Адрес электронной почты, IP-адрес, данные браузера (user agent), а также сведения о действиях в системе учёта техники.</p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">Для чего мы их используем</h3>
            <p>Авторизация и разграничение прав доступа, учёт и инвентаризация техники, аналитика посещаемости сайта.</p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">Где хранятся данные</h3>
            <p>Учётные данные и данные о технике — в Supabase; обезличенная статистика посещаемости — в Яндекс.Метрике.</p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-900">Права пользователя</h3>
            <p>Вы вправе запросить доступ к своим персональным данным, их исправление или удаление, а также отозвать согласие на обработку, написав на info@ucg.ru.</p>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
