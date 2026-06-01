import React from 'react'

function downloadCSV(rows, filename='export.csv'){
  const header = ['Серийник','Категория','Модель','Кол-во','Примечание']
  const csv = [header.join(',')].concat(rows.map(r=>[r.serial||r.id, r.category, '"'+r.model+'"', r.quantity, '"'+(r.note||'')+'"'].join(','))).join('\n')
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function EquipmentTable({ title, rows }){
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={()=>downloadCSV(rows, title.replace(/\s+/g,'_')+'.csv')} className="text-sm px-3 py-1 bg-ucg-accent text-white rounded">📥 Скачать CSV</button>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-gray-500">Нет данных для этого объекта</div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2">Серийник</th>
                <th className="px-3 py-2">Категория</th>
                <th className="px-3 py-2">Модель</th>
                <th className="px-3 py-2">Кол-во</th>
                <th className="px-3 py-2">Примечание</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.serial||r.id}</td>
                  <td className="px-3 py-2">{r.category}</td>
                  <td className="px-3 py-2">{r.model}</td>
                  <td className="px-3 py-2">{r.quantity}</td>
                  <td className="px-3 py-2">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
