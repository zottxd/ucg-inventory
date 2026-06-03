import React, { useMemo, useState } from 'react'

const downloadCSV = (data = [], filename = 'export') => {
  const safeRows = Array.isArray(data) ? data : []
  const headers = ['Модель', 'Серийный номер', 'Категория', 'Количество']

  const csvContent = [
    headers.join(','),
    ...safeRows.map((row) =>
      [
        row?.model || '',
        row?.serial || '',
        row?.category || '',
        row?.quantity || ''
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
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState('list') // Default to list view
  const [selectedImage, setSelectedImage] = useState(null) // State for full-size image modal

  const categories = useMemo(() => {
    const unique = [...new Set(safeRows.map(row => row?.category).filter(Boolean))]
    return unique
  }, [safeRows])

  const filteredRows = useMemo(() => {
    if (selectedCategory === 'all') return safeRows
    return safeRows.filter(row => row?.category === selectedCategory)
  }, [safeRows, selectedCategory])

  const groupedByCategory = useMemo(() => {
    return filteredRows.reduce((acc, row) => {
      const category = row?.category || 'Без категории'
      if (!acc[category]) {
        acc[category] = {
          category,
          totalQuantity: 0,
          models: new Set(),
          count: 0
        }
      }
      acc[category].totalQuantity += parseInt(row?.quantity, 10) || 0
      if (row?.model) acc[category].models.add(row.model)
      acc[category].count += 1
      return acc
    }, {})
  }, [filteredRows])

  const summaryItems = useMemo(() => Object.values(groupedByCategory), [groupedByCategory])

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <p className="text-sm text-gray-500">{safeRows.length} записей</p>
        <button
          onClick={() => downloadCSV(filteredRows, title?.replace(/\s+/g, '_') || 'export')}
          className="w-full md:w-auto px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
        >
          📥 Скачать CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded ${viewMode === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            📊 Сводка
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            📋 Список
          </button>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded bg-white"
        >
          <option value="all">Все категории</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {viewMode === 'summary' ? (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">📊 Сводка по категориям</h3>
          {summaryItems.length === 0 ? (
            <div className="text-gray-500">Нет данных для отображения сводки.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaryItems.map((data) => (
                <div key={data.category} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-lg">{data.category}</h4>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {data.totalQuantity} шт
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Единиц: {data.count}</p>
                    <p>Моделей: {data.models.size}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {viewMode === 'list' ? (
        <>
          {/* Десктопная таблица */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Модель</th>
                  <th className="border p-2">Фото</th>
                  <th className="border p-2">Серийный номер</th>
                  <th className="border p-2">Категория</th>
                  <th className="border p-2">Количество</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row?.id || index} className="hover:bg-gray-50">
                    <td className="border p-2 font-semibold">{row?.model || '-'}</td>
                    <td className="border p-2">
                      {row?.photo_url ? (
                        <img 
                          src={row.photo_url} 
                          alt="Equipment" 
                          className="w-12 h-12 object-cover rounded cursor-pointer"
                          onClick={() => setSelectedImage(row.photo_url)}
                        />
                      ) : (
                        <span className="text-gray-400">📦</span>
                      )}
                    </td>
                    <td className="border p-2">{row?.serial || '-'}</td>
                    <td className="border p-2">{row?.category || '-'}</td>
                    <td className="border p-2">{row?.quantity || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Мобильные карточки */}
          <div className="md:hidden space-y-3">
            {filteredRows.map((row, index) => (
              <div key={row?.id || index} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  {row?.photo_url ? (
                    <img 
                      src={row.photo_url} 
                      alt="Equipment" 
                      className="w-16 h-16 object-cover rounded"
                      onClick={() => setSelectedImage(row.photo_url)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-lg">{row?.model || '-'}</div>
                    <div className="text-sm text-gray-600">{row?.category || '-'}</div>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="font-semibold">S/N:</span> {row?.serial || '-'}</p>
                  <p><span className="font-semibold">Количество:</span> {row?.quantity || 1} шт</p>
                </div>
              </div>
            ))}
          </div>

          {/* Модальное окно */}
          {selectedImage && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <img src={selectedImage} alt="Full size" className="max-w-full max-h-[90vh] rounded" />
            </div>
          )}

          {filteredRows.length === 0 && (
            <div className="text-center py-8 text-gray-500">Нет данных</div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default React.memo(EquipmentTable)
