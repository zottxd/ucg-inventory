import React from 'react'

export default function PrivacyPolicyModal({ open, onClose }){
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">Политика конфиденциальности</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded px-2 py-1 text-sm transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <section>
            <h3 className="font-semibold">1. Какие данные мы собираем</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">
              Адрес электронной почты, IP-адрес, данные авторизации (идентификатор пользователя,
              роль, время входа), а также технические данные о посещении сайта.
            </p>
          </section>

          <section>
            <h3 className="font-semibold">2. Цели обработки</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">
              Аналитика использования сервиса, учёт техники и оборудования, авторизация
              и разграничение прав доступа.
            </p>
          </section>

          <section>
            <h3 className="font-semibold">3. Где хранятся данные</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">
              Supabase (база данных, авторизация, файловое хранилище) и Яндекс.Метрика
              (обезличенная статистика посещений).
            </p>
          </section>

          <section>
            <h3 className="font-semibold">4. Ваши права</h3>
            <p className="mt-1 text-gray-700 dark:text-gray-300">
              Вы вправе запросить доступ к своим персональным данным, их исправление
              или удаление, а также отозвать согласие на обработку. Для этого напишите
              на info@ucg.ru.
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-blue-700"
        >
          Закрыть
        </button>
      </div>
    </div>
  )
}
