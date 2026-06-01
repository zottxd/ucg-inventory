import React from 'react'

export default function Footer(){
  return (
    <footer className="bg-ucg-dark text-white mt-8">
      <div className="max-w-[1200px] mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <h4 className="font-semibold">UCG</h4>
          <p className="text-sm text-white/80">Корпоративный инвентарь</p>
        </div>
        <div>
          <h4 className="font-semibold">Ссылки</h4>
          <ul className="text-sm text-white/80 space-y-1 mt-2">
            <li>Документы</li>
            <li>Поддержка</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Контакты</h4>
          <p className="text-sm text-white/80 mt-2">info@ucg.ru</p>
        </div>
        <div>
          <h4 className="font-semibold">Юридическая информация</h4>
          <p className="text-sm text-white/80 mt-2">© UCG {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  )
}
