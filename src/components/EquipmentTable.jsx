import React from 'react'

const downloadCSV = (data = [], filename = 'export') => {
  const safeRows = Array.isArray(data) ? data : []
  const headers = ['Серийный номер', 'Категория', 'Модель', 'Количество', 'Заметки']

  const csvContent = [
    headers.join(','),
    ...safeRows.map((row) =>
      [
        row?.serial || '',
        row?.category || '',
        row?.model || '',
        row?.quantity || '',
        row?.notes || ''
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

const EquipmentTable = ({ title, rows }) => {
  const safeRows = Array.isArray(rows) ? rows : []

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={() => downloadCSV(safeRows, title?.replace(/\s+/g, '_') || 'export')}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          📥 Скачать CSV
        </button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Серийный номер</th>
            <th className="border p-2">Категория</th>
            <th className="border p-2">Модель</th>
            <th className="border p-2">Количество</th>
            <th className="border p-2">Заметки</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={row?.id || index} className="hover:bg-gray-50">
              <td className="border p-2">{row?.serial || '-'}</td>
              <td className="border p-2">{row?.category || '-'}</td>
              <td className="border p-2">{row?.model || '-'}</td>
              <td className="border p-2">{row?.quantity || 0}</td>
              <td className="border p-2">{row?.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {safeRows.length === 0 && (
        <div className="text-center py-8 text-gray-500">Нет данных</div>
      )}
    </div>
  )
}

export default React.memo(EquipmentTable)
