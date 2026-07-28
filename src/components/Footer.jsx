import React, { useState } from 'react'
import PrivacyPolicyModal from './PrivacyPolicyModal'

const linkClass = 'text-slate-400 hover:text-white transition-colors'

export default function Footer(){
  const [showPolicy, setShowPolicy] = useState(false)

  return (
    <footer className="bg-slate-900 text-white py-10 px-4">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h4 className="font-semibold">UCG</h4>
          <p className="text-sm text-slate-400 mt-2">Корпоративный инвентарь</p>
        </div>

        <div>
          <h4 className="font-semibold">Ссылки</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li><a href="#/" className={linkClass}>Каталог</a></li>
            <li><a href="#/" className={linkClass}>Документы</a></li>
            <li><a href="mailto:info@ucg.ru" className={linkClass}>Поддержка</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Контакты</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li><a href="mailto:info@ucg.ru" className={linkClass}>info@ucg.ru</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Юридическая информация</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>
              <button type="button" onClick={() => setShowPolicy(true)} className={linkClass}>
                Политика конфиденциальности
              </button>
            </li>
            <li className="text-slate-400">© UCG {new Date().getFullYear()}</li>
          </ul>
        </div>
      </div>

      <PrivacyPolicyModal open={showPolicy} onClose={() => setShowPolicy(false)} />
    </footer>
  )
}
