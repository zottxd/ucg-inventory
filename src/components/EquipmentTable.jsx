import React from 'react'

const EquipmentTable = ({ rows, onEdit, onDelete }) => {
  const safeRows = Array.isArray(rows) ? rows : []

  return (
    <div className="w-full">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Серийный номер</th>
            <th className="border p-2">Категория</th>
            <th className="border p-2">Модель</th>
            <th className="border p-2">Количество</th>
            <th className="border p-2">Заметки</th>
            <th className="border p-2">Действия</th>
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
              <td className="border p-2">
                <button
                  onClick={() => onEdit?.(row)}
                  className="px-2 py-1 bg-blue-500 text-white rounded mr-2"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete?.(row)}
                  className="px-2 py-1 bg-red-500 text-white rounded"
                >
                  🗑️
                </button>
              </td>
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
