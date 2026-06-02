import React from 'react'
import { List } from 'react-window'

function downloadCSV(rows = [], filename='export.csv'){
  const safeRows = Array.isArray(rows) ? rows : []
  const header = ['Серийник','Категория','Модель','Кол-во','Примечание']
  const csv = [header.join(',')].concat(safeRows.map(r => [r?.serial || r?.id, r?.category, '"'+(r?.model || '')+'"', r?.quantity, '"'+(r?.notes || '')+'"'].join(','))).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function EquipmentTable({ title, rows }){
  const safeRows = Array.isArray(rows) ? rows : []
  const itemCount = safeRows.length
  const listHeight = Math.min(itemCount * 45, 500)

  const Row = ({ index, style, data }) => {
    const row = data?.[index] || {}
    console.log('EquipmentTable row:', row, typeof row)
    return (
      <div style={style} className="grid grid-cols-[2fr_2fr_2fr_1fr_1fr] items-center border-t bg-white text-sm">
        <div className="px-3 py-2">{row?.serial || row?.id}</div>
        <div className="px-3 py-2">{row?.category}</div>
        <div className="px-3 py-2">{row?.model}</div>
        <div className="px-3 py-2">{row?.quantity}</div>
        <div className="px-3 py-2">{row?.notes}</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={() => downloadCSV(rows, title.replace(/\s+/g,'_') + '.csv')} className="text-sm px-3 py-1 bg-ucg-accent text-white rounded">📥 Скачать CSV</button>
      </div>

      {itemCount === 0 ? (
        <div className="p-6 text-gray-500">Нет данных для этого объекта</div>
      ) : (
        <div className="overflow-hidden">
          <div className="grid grid-cols-[2fr_2fr_2fr_1fr_1fr] text-left text-gray-600 text-sm border-b bg-slate-50">
            <div className="px-3 py-2">Серийник</div>
            <div className="px-3 py-2">Категория</div>
            <div className="px-3 py-2">Модель</div>
            <div className="px-3 py-2">Кол-во</div>
            <div className="px-3 py-2">Примечание</div>
          </div>
          <List
            height={listHeight}
            itemCount={itemCount}
            itemSize={45}
            width="100%"
            itemData={safeRows}
          >
            {Row}
          </List>
        </div>
      )}
    </div>
  )
}

export default React.memo(EquipmentTable)
