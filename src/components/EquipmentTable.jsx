import React, { useMemo, useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

const downloadCSV = (data = [], filename = 'export', locationInfo = null) => {
  const safeRows = Array.isArray(data) ? data : []

  // Экранирование значений: если содержит ; или ", оборачиваем в кавычки и удваиваем кавычки
  const escapeCSVValue = (value) => {
    const str = String(value).trim()
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Формируем заголовки на основе наличия информации об объекте
  const headers = ['Модель', 'Серийный номер', 'Категория', 'Количество']
  if (locationInfo?.name || locationInfo?.address) {
    headers.unshift('Объект')
    if (locationInfo?.address) {
      headers.push('Адрес')
    }
  }

  // Создаём CSV с разделителем точка с запятой (;)
  const csvLines = [
    // Заголовок с BOM для правильной кодировки UTF-8
    '\uFEFF' + headers.map(escapeCSVValue).join(';'),
    // Строки данных
    ...safeRows.map((row) => {
      const rowData = []

      // Добавляем информацию об объекте в начало каждой строки
      if (locationInfo?.name || locationInfo?.address) {
        rowData.push(locationInfo?.name || '')
      }

      // Основные данные
      rowData.push(
        row?.model || '',
        row?.serial || '',
        row?.category || '',
        row?.quantity || ''
      )

      // Добавляем адрес в конец строки (если нужен)
      if (locationInfo?.address) {
        rowData.push(locationInfo.address)
      }

      return rowData.map(escapeCSVValue).join(';')
    })
  ]

  const csvContent = csvLines.join('\n')

  // Создаём Blob с правильной кодировкой UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

const EquipmentTable = ({
  title,
  rows,
  showLocationPicker = false,
  locations: locationsProp = [],
  onLocationSelect,
  locationQuery = '',
  onLocationQueryChange,
  locationInfo = null,
}) => {
  const safeRows = Array.isArray(rows) ? rows : []
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState('list')
  const [selectedImage, setSelectedImage] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [locations, setLocations] = useState(locationsProp)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationDropdownRef = useRef(null)

  const debouncedSearchQuery = useDebounce(searchQuery, 100)
  const debouncedLocationQuery = useDebounce(locationQuery, 100)

  useEffect(() => {
    setLocations(locationsProp)
  }, [locationsProp])

  useEffect(() => {
    if (!showLocationPicker || locationsProp.length > 0) return

    async function loadLocations() {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address')
        .order('name')

      if (!error) {
        setLocations(data || [])
      }
    }

    loadLocations()
  }, [showLocationPicker, locationsProp.length])

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredLocations = useMemo(() => {
    const q = debouncedLocationQuery.trim().toLowerCase()
    if (!q) return locations
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        (loc.address && loc.address.toLowerCase().includes(q))
    )
  }, [locations, debouncedLocationQuery])

  const categories = useMemo(() => {
    const unique = [...new Set(safeRows.map((row) => row?.category).filter(Boolean))]
    return unique
  }, [safeRows])

  const filteredRows = useMemo(() => {
    let result = safeRows

    if (selectedCategory !== 'all') {
      result = result.filter((row) => row?.category === selectedCategory)
    }

    const q = debouncedSearchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (row) =>
          (row?.model || '').toLowerCase().includes(q) ||
          (row?.serial || '').toLowerCase().includes(q) ||
          (row?.category || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [safeRows, selectedCategory, debouncedSearchQuery])

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

  if (showLocationPicker) {
    return (
      <div className="w-full">
        <div className="relative max-w-xl mx-auto" ref={locationDropdownRef}>
          <input
            type="text"
            placeholder="🔍 Введите название объекта..."
            value={locationQuery}
            onChange={(e) => {
              onLocationQueryChange?.(e.target.value)
              setShowLocationDropdown(true)
            }}
            onFocus={() => setShowLocationDropdown(true)}
            onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
            className="w-full border border-gray-300 dark:border-slate-600 rounded px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:outline-none transition bg-white dark:bg-slate-900 shadow-sm"
          />

          {showLocationDropdown && filteredLocations.length > 0 && (
            <div className="absolute mt-1 max-h-60 overflow-y-auto rounded shadow-lg border border-gray-200 dark:border-slate-700 w-full bg-white dark:bg-slate-900 z-50">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onLocationSelect?.(loc)
                    onLocationQueryChange?.(loc.name)
                    setShowLocationDropdown(false)
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 transition"
                >
                  <div className="font-medium text-gray-800 dark:text-gray-100">{loc.name}</div>
                  {loc.address && <div className="text-sm text-gray-500 dark:text-gray-400">{loc.address}</div>}
                </div>
              ))}
            </div>
          )}

          {showLocationDropdown && debouncedLocationQuery && filteredLocations.length === 0 && (
            <div className="absolute mt-1 w-full bg-white dark:bg-slate-900 border rounded shadow-lg z-50 px-4 py-3 text-gray-500 dark:text-gray-400 text-center text-sm">
              Ничего не найдено
            </div>
          )}
        </div>

        <div className="text-center py-10 text-gray-500 dark:text-gray-400 mt-4">
          <p className="text-lg">🔍 Введите название объекта, чтобы посмотреть инвентарь</p>
          <p className="text-sm mt-2">Например: &quot;Двинцев&quot;, &quot;АвтоВАЗ&quot;, &quot;Спортмастер&quot;</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Информация об объекте (если выбран) */}
      {locationInfo?.name && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
          <span className="font-semibold">📍 Объект:</span> {locationInfo.name}
          {locationInfo.address && <span className="block mt-1"><span className="font-semibold">📬 Адрес:</span> {locationInfo.address}</span>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{filteredRows.length} из {safeRows.length} записей</p>
        <button
          onClick={() => downloadCSV(filteredRows, title?.replace(/\s+/g, '_') || 'export', locationInfo)}
          className="w-full md:w-auto px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
        >
          📥 Скачать CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="🔍 Поиск по модели, серийнику, категории..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border rounded bg-white dark:bg-slate-900"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded ${viewMode === 'summary' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
          >
            📊 Сводка
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
          >
            📋 Список
          </button>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded bg-white dark:bg-slate-900"
        >
          <option value="all">Все категории</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {viewMode === 'summary' ? (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">📊 Сводка по категориям</h3>
          {summaryItems.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">Нет данных для отображения сводки.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaryItems.map((data) => (
                <div key={data.category} className="border rounded-lg p-4 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-lg">{data.category}</h4>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {data.totalQuantity} шт
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-800">
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
                          loading="lazy"
                          decoding="async"
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

          <div className="md:hidden space-y-3">
            {filteredRows.map((row, index) => (
              <div key={row?.id || index} className="border rounded-lg p-4 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  {row?.photo_url ? (
                    <img
                      src={row.photo_url}
                      alt="Equipment"
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 object-cover rounded cursor-pointer"
                      onClick={() => setSelectedImage(row.photo_url)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-lg">{row?.model || '-'}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{row?.category || '-'}</div>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="font-semibold">S/N:</span> {row?.serial || '-'}</p>
                  <p><span className="font-semibold">Количество:</span> {row?.quantity || 1} шт</p>
                </div>
              </div>
            ))}
          </div>

          {selectedImage && (
            <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
              <img src={selectedImage} decoding="async" className="max-w-full max-h-[90vh] rounded" alt="Просмотр" />
            </div>
          )}

          {filteredRows.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Нет данных</div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default React.memo(EquipmentTable)
