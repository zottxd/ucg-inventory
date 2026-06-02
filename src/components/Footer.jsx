import React from 'react'

export default function Footer(){
  return (
    <footer className="bg-ucg-dark text-white py-8 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
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
