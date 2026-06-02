import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabase'

// Списки категорий для разделения техники
const IT_CATEGORIES = ['Ноутбук','Компьютер','Монитор','Принтер','Сканер','Телефон','Роутер','Сервер','Планшет']

function ConfirmModal({ open, title, onCancel, onConfirm }){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div onClick={onCancel} className="absolute inset-0 bg-black/40" />
      <div className="bg-white rounded p-6 z-50 max-w-md w-full">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 border rounded">Отмена</button>
          <button onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">Удалить</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel(){
  const [locations, setLocations] = useState([])
  const [itAssets, setItAssets] = useState([])
  const [nonItAssets, setNonItAssets] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newLoc, setNewLoc] = useState({name:'', address:'', id:''})
  const [confirm, setConfirm] = useState({open:false, loc:null})

  // Active tab for tables: 'it' or 'equipment'
  const [activeTab, setActiveTab] = useState('it') // 'it' или 'equipment'

  const [editLocation, setEditLocation] = useState(null)
  const [locationSearch, setLocationSearch] = useState('')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationDropdownRef = useRef(null)

  const [loadingLocations, setLoadingLocations] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Фильтрация списка объектов для поиска
  // Загрузка списка объектов при старте
  useEffect(()=>{
    async function loadLocations(){
      console.log('Loading locations...')
      setLoadingLocations(true)
      setErrorMessage('')
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id,name,address')
          .order('name')

        console.log('Locations loaded:', data, error)

        if (error) {
          console.error('Load locations error:', error)
          if (error.status === 401 || error.status === 403) {
            setErrorMessage(
              'Ошибка доступа к таблице locations. Запустите в Supabase: GRANT ALL ON locations TO anon;'
            )
          } else if (error.message?.includes('does not exist')) {
            setErrorMessage(
              'Таблица locations не найдена. Проверьте схему или создайте таблицу вручную.'
            )
          } else {
            setErrorMessage('Не удалось загрузить объекты')
          }
          setLocations([])
          return
        }

        if (!data || data.length === 0) {
          setLocations([])
          return
        }

        setLocations(data)
      } catch (err) {
        console.error('Load locations error:', err)
        const message = err?.message || String(err)
        if (message.includes('permission') || message.includes('401') || message.includes('403')) {
          setErrorMessage(
            'Ошибка доступа: выполните в Supabase: GRANT ALL ON locations TO anon;'
          )
        } else if (message.includes('does not exist')) {
          setErrorMessage(
            'Таблица locations не найдена. Создайте её в Supabase или проверьте имя таблицы.'
          )
        } else {
          setErrorMessage('Не удалось загрузить объекты')
        }
        setLocations([])
      } finally {
        setLoadingLocations(false)
      }
    }
    loadLocations()
  },[])

  // Загрузка техники при выборе объекта
  const loadAssets = async (locationId) => {
    if (!locationId) return;

    console.log('Loading assets for location_id:', locationId)
    setLoadingAssets(true)
    setErrorMessage('')
    try {
      // Load IT assets from it_assets table
      const { data: itData, error: itError } = await supabase
        .from('it_assets')
        .select('*')
        .eq('location_id', locationId)
      
      if(itError) throw itError
      
      // Load Equipment assets from equipment_assets table
      const { data: eqData, error: eqError } = await supabase
        .from('equipment_assets')
        .select('*')
        .eq('location_id', locationId)
      
      if(eqError) throw eqError
      
      setItAssets(itData || [])
      setNonItAssets(eqData || [])
      
      console.log('IT assets loaded:', itData?.length || 0)
      console.log('Equipment assets loaded:', eqData?.length || 0)
    } catch (error) {
      console.error('Load assets error:', error)
      setErrorMessage('Не удалось загрузить технику')
    } finally {
      setLoadingAssets(false)
    }
  }

  useEffect(()=>{
    console.log('Edit location changed:', editLocation?.id, editLocation?.name)
    if(!editLocation?.id){
      setItAssets([])
      setNonItAssets([])
      return
    }
    loadAssets(editLocation.id)
  },[editLocation])

  // Создание нового объекта
  async function createLocation(){
    if(!newLoc.name.trim()) return
    setSaving(true)
    setErrorMessage('')
    try {
      const payload = { 
        name: newLoc.name.trim(), 
        address: newLoc.address.trim() 
      }
      if(newLoc.id.trim()) payload.id = newLoc.id.trim()
      
      const { data, error } = await supabase
        .from('locations')
        .insert([payload])
        .select()
        .single()
      
      if(error) throw error
      
      setLocations(prev => [data, ...prev])
      setNewLoc({name:'', address:'', id:''})
      setShowAdd(false)
      setStatusMessage('✅ Объект создан')
    } catch (err) {
      console.error('Create location error:', err)
      setErrorMessage('❌ Ошибка создания объекта')
    } finally {
      setSaving(false)
    }
  }

  // Удаление объекта и всей его техники
  async function deleteLocation(loc){
    if(!loc) return
    setSaving(true)
    setErrorMessage('')
    try {
      // Delete from both IT and Equipment tables
      await supabase.from('it_assets').delete().eq('location_id', loc.id)
      await supabase.from('equipment_assets').delete().eq('location_id', loc.id)
      
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', loc.id)
      
      if(error) throw error
      
      setLocations(prev => prev.filter(l => l.id !== loc.id))
      setItAssets(prev => prev.filter(a => a.location_id !== loc.id))
      setNonItAssets(prev => prev.filter(a => a.location_id !== loc.id))
      
      if(editLocation?.id === loc.id){
        setEditLocation(null)
        setLocationSearch('')
      }
      setConfirm({open:false, loc:null})
      setStatusMessage('✅ Объект удалён')
    } catch (err) {
      console.error('Delete location error:', err)
      setErrorMessage('❌ Ошибка удаления объекта')
    } finally {
      setSaving(false)
    }
  }

  const selectLocation = useCallback((loc) => {
    console.log('Dropdown selected location:', loc?.id, loc?.name)
    if (!loc) {
      setEditLocation(null)
      return
    }
    setEditLocation(loc)
  }, [])

  // Изменение ячейки в таблице
  const handleCellChange = useCallback((type, id, field, value) => {
    if (type === 'it') {
      setItAssets(prev => prev.map(row => 
        row.id === id ? {...row, [field]: value} : row
      ))
    } else {
      setNonItAssets(prev => prev.map(row => 
        row.id === id ? {...row, [field]: value} : row
      ))
    }
  }, [])

  // Добавление строки в IT таблицу
  function addItRow(){
    if(!editLocation?.id) return
    setItAssets(prev => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        serial: '',
        category: 'Ноутбук', // Дефолтная категория
        model: '',
        quantity: 1,
        notes: '',
        location_id: editLocation.id,
        isNew: true,
      }
    ])
  }

  // Добавление строки в таблицу Оборудования
  function addNonItRow(){
    if(!editLocation?.id) return
    setNonItAssets(prev => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        serial: '',
        category: 'Холодильник', // Дефолтная категория
        model: '',
        quantity: 1,
        notes: '',
        location_id: editLocation.id,
        isNew: true,
      }
    ])
  }

  // Удаление строки
  async function deleteRow(type, id){
    // Сначала удаляем из локального состояния
    if (type === 'it') {
      setItAssets(prev => prev.filter(r => r.id !== id))
    } else {
      setNonItAssets(prev => prev.filter(r => r.id !== id))
    }
    
    // Если это новая (не сохраненная) строка — просто убираем из UI
    if(String(id).startsWith('new-')){
      setStatusMessage('🗑 Строка удалена')
      return
    }
    
    // Иначе удаляем из базы
    const tableName = type === 'it' ? 'it_assets' : 'equipment_assets'
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      
      if(error) throw error
      setStatusMessage('🗑 Строка удалена из базы')
    } catch (err) {
      console.error('Delete row error:', err)
      setErrorMessage('❌ Ошибка удаления строки')
      // Восстанавливаем строку при ошибке
      loadAssets(editLocation.id)
    }
  }

  // Сохранение изменений в базу
  async function saveChanges(){
    if(!editLocation?.id) {
      setErrorMessage('❌ Выберите объект для редактирования')
      return
    }
    
    setErrorMessage('')
    setStatusMessage('')
    setSaving(true)

    try {
      // --- Сохранение IT техники ---
      const itRowsToInsert = itAssets.filter(r => r.isNew)
      const itRowsToUpdate = itAssets.filter(r => !r.isNew && !r.isNewDeleted)
      
      // Insert new IT rows
      for(const row of itRowsToInsert){
        const { data, error } = await supabase
          .from('it_assets')
          .insert([{
            serial: row.serial,
            category: row.category,
            model: row.model,
            quantity: row.quantity,
            notes: row.notes,
            location_id: editLocation.id,
          }])
          .select()
        if(error) throw error
        // Обновляем ID новой строки на реальный из базы
        if (data && data[0]) {
          setItAssets(prev => prev.map(r => 
            r.id === row.id ? {...r, id: data[0].id, isNew: false} : r
          ))
        }
      }

      // Update existing IT rows
      for(const row of itRowsToUpdate){
        const { error } = await supabase
          .from('it_assets')
          .update({
            serial: row.serial,
            category: row.category,
            model: row.model,
            quantity: row.quantity,
            notes: row.notes,
          })
          .eq('id', row.id)
        if(error) throw error
      }

      // --- Сохранение Оборудования ---
      const eqRowsToInsert = nonItAssets.filter(r => r.isNew)
      const eqRowsToUpdate = nonItAssets.filter(r => !r.isNew && !r.isNewDeleted)
      
      // Insert new Equipment rows
      for(const row of eqRowsToInsert){
        const { data, error } = await supabase
          .from('equipment_assets')
          .insert([{
            serial: row.serial,
            category: row.category,
            model: row.model,
            quantity: row.quantity,
            notes: row.notes,
            location_id: editLocation.id,
          }])
          .select()
        if(error) throw error
        if (data && data[0]) {
          setNonItAssets(prev => prev.map(r => 
            r.id === row.id ? {...r, id: data[0].id, isNew: false} : r
          ))
        }
      }

      // Update existing Equipment rows
      for(const row of eqRowsToUpdate){
        const { error } = await supabase
          .from('equipment_assets')
          .update({
            serial: row.serial,
            category: row.category,
            model: row.model,
            quantity: row.quantity,
            notes: row.notes,
          })
          .eq('id', row.id)
        if(error) throw error
      }

      // Перезагружаем данные после сохранения
      await loadAssets(editLocation.id)
      setStatusMessage('✅ Изменения сохранены')
      
    } catch (error) {
      console.error('Save error:', error)
      setErrorMessage('❌ Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="max-w-[1200px] mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6 text-blue-800">⚙️ ПАНЕЛЬ АДМИНИСТРАТОРА</h1>

        {/* Сообщения о статусе */}
        {errorMessage && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">{errorMessage}</div>}
        {statusMessage && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded border border-green-200">{statusMessage}</div>}

        {/* Секция 2: Редактор техники */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-4">✏️ Редактор техники</h2>
          
          {/* Выбор объекта - AUTOCOMPLETE */}
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
            <div className="relative flex-1" ref={locationDropdownRef}>
              <input
                type="text"
                placeholder="🔍 Поиск объекта..."
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value)
                  setShowLocationDropdown(true)
                }}
                onFocus={() => setShowLocationDropdown(true)}
                onBlur={() => setTimeout(() => setShowLocationDropdown(false), 200)}
                className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:outline-none transition"
              />
              
              {/* Dropdown list */}
              {showLocationDropdown && (
                <div className="absolute mt-1 max-h-60 overflow-y-auto rounded shadow-lg border border-gray-200 w-full bg-white z-50">
                  {locations
                    .filter(loc =>
                      loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
                      (loc.address && loc.address.toLowerCase().includes(locationSearch.toLowerCase()))
                    )
                    .map(loc => (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setEditLocation(loc)
                          setLocationSearch(loc.name)
                          setShowLocationDropdown(false)
                        }}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 transition"
                      >
                        <div className="font-medium text-gray-800">{loc.name}</div>
                        {loc.address && (
                          <div className="text-sm text-gray-500">{loc.address}</div>
                        )}
                      </div>
                    ))}
                  
                  {/* Empty state */}
                  {locations.filter(loc =>
                    loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
                    (loc.address && loc.address.toLowerCase().includes(locationSearch.toLowerCase()))
                  ).length === 0 && (
                    <div className="px-4 py-3 text-gray-500 text-center text-sm">
                      Ничего не найдено
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
              disabled={saving}
            >
              ➕ Добавить
            </button>

            {editLocation && (
              <button
                onClick={() => setConfirm({open:true, loc: editLocation})}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                disabled={saving}
              >
                🗑 Удалить
              </button>
            )}
          </div>

          {!editLocation ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
              <p className="text-lg">👆 Выберите объект, чтобы начать редактирование</p>
            </div>
          ) : (
            <div>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>📍 Редактируете:</strong> {editLocation.name}
                  {editLocation.address && <span className="text-blue-600 ml-2">• {editLocation.address}</span>}
                </p>
              </div>

              {loadingAssets ? (
                <div className="p-8 text-center text-gray-600">Загрузка техники...</div>
              ) : (
                <div>
                  {/* Tabs switcher */}
                  <div className="flex gap-2 mb-4" data-ignore-autocomplete="true">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveTab('it'); setShowLocationDropdown(false); }}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`px-4 py-2 rounded font-medium transition ${
                        activeTab === 'it'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      💻 IT ТЕХНИКА
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveTab('equipment'); setShowLocationDropdown(false); }}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`px-4 py-2 rounded font-medium transition ${
                        activeTab === 'equipment'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      🏭 ОБОРУДОВАНИЕ
                    </button>
                  </div>

                  {/* IT tab */}
                  {activeTab === 'it' && (
                    <div className="bg-white rounded-lg border shadow-sm mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                        <h3 className="font-semibold text-blue-800">💻 IT ТЕХНИКА</h3>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <button 
                            onClick={addItRow} 
                            disabled={saving}
                            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition disabled:opacity-50"
                          >
                            ➕ Добавить
                          </button>
                        </div>
                      </div>

                      {itAssets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Нет IT техники для этого объекта</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr className="text-left text-gray-600 border-b">
                                <th className="px-3 py-2">Серийник *</th>
                                <th className="px-3 py-2">Категория *</th>
                                <th className="px-3 py-2">Модель</th>
                                <th className="px-3 py-2 w-16">Кол-во</th>
                                <th className="px-3 py-2">Примечание</th>
                                <th className="px-3 py-2 w-10"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {itAssets.map(r => (
                                <tr key={r.id} className="border-t hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <input 
                                      value={r.serial || ''} 
                                      onChange={e => handleCellChange('it', r.id, 'serial', e.target.value)} 
                                      className="border rounded px-2 py-1 w-32 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                      placeholder="DV-001"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      type="text" 
                                      required 
                                      placeholder="Ноутбук" 
                                      value={r.category || ''} 
                                      onChange={e => handleCellChange('it', r.id, 'category', e.target.value)} 
                                      className="border rounded px-2 py-1 w-36 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                    <div className="text-[10px] text-gray-400 mt-0.5">IT: Ноутбук, ПК...</div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      value={r.model || ''} 
                                      onChange={e => handleCellChange('it', r.id, 'model', e.target.value)} 
                                      className="border rounded px-2 py-1 w-40 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      type="number" 
                                      min="1"
                                      value={r.quantity || 1} 
                                      onChange={e => handleCellChange('it', r.id, 'quantity', parseInt(e.target.value) || 1)} 
                                      className="border rounded px-2 py-1 w-16 text-center focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      value={r.notes || ''} 
                                      onChange={e => handleCellChange('it', r.id, 'notes', e.target.value)} 
                                      className="border rounded px-2 py-1 w-32 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button 
                                      onClick={() => deleteRow('it', r.id)} 
                                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                                      title="Удалить строку"
                                    >
                                      🗑
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Equipment tab */}
                  {activeTab === 'equipment' && (
                    <div className="bg-white rounded-lg border shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                        <h3 className="font-semibold text-blue-800">🏭 ОБОРУДОВАНИЕ</h3>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <button 
                            onClick={addNonItRow} 
                            disabled={saving}
                            className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition disabled:opacity-50"
                          >
                            ➕ Добавить
                          </button>
                        </div>
                      </div>

                      {nonItAssets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Нет оборудования для этого объекта</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr className="text-left text-gray-600 border-b">
                                <th className="px-3 py-2">Серийник *</th>
                                <th className="px-3 py-2">Категория *</th>
                                <th className="px-3 py-2">Модель</th>
                                <th className="px-3 py-2 w-16">Кол-во</th>
                                <th className="px-3 py-2">Примечание</th>
                                <th className="px-3 py-2 w-10"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {nonItAssets.map(r => (
                                <tr key={r.id} className="border-t hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <input 
                                      value={r.serial || ''} 
                                      onChange={e => handleCellChange('eq', r.id, 'serial', e.target.value)} 
                                      className="border rounded px-2 py-1 w-32 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                      placeholder="FR-001"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      type="text" 
                                      required 
                                      placeholder="Холодильник" 
                                      value={r.category || ''} 
                                      onChange={e => handleCellChange('eq', r.id, 'category', e.target.value)} 
                                      className="border rounded px-2 py-1 w-36 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                    <div className="text-[10px] text-gray-400 mt-0.5">Оборуд.: Стол, Стул...</div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      value={r.model || ''} 
                                      onChange={e => handleCellChange('eq', r.id, 'model', e.target.value)} 
                                      className="border rounded px-2 py-1 w-40 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      type="number" 
                                      min="1"
                                      value={r.quantity || 1} 
                                      onChange={e => handleCellChange('eq', r.id, 'quantity', parseInt(e.target.value) || 1)} 
                                      className="border rounded px-2 py-1 w-16 text-center focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input 
                                      value={r.notes || ''} 
                                      onChange={e => handleCellChange('eq', r.id, 'notes', e.target.value)} 
                                      className="border rounded px-2 py-1 w-32 focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button 
                                      onClick={() => deleteRow('eq', r.id)} 
                                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                                      title="Удалить строку"
                                    >
                                      🗑
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Кнопка Сохранить (общая для обеих таблиц) */}
              {editLocation && (itAssets.length > 0 || nonItAssets.length > 0) && (
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={saveChanges} 
                    disabled={saving}
                    className="px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin">⏳</span> Сохранение...
                      </>
                    ) : (
                      <>💾 Сохранить все изменения</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Модальное окно: Добавить объект */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={()=>setShowAdd(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="bg-white rounded-xl shadow-2xl z-50 max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">➕ Добавить объект</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название объекта *</label>
                <input 
                  value={newLoc.name} 
                  onChange={e => setNewLoc(s => ({...s, name: e.target.value}))} 
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-orange-600 focus:outline-none"
                  placeholder="Например: Офис Москва"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                <input 
                  value={newLoc.address} 
                  onChange={e => setNewLoc(s => ({...s, address: e.target.value}))} 
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-orange-600 focus:outline-none"
                  placeholder="г. Москва, ул. Примерная, д. 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Идентификатор <span className="text-gray-400 font-normal">(опционально)</span></label>
                <input 
                  value={newLoc.id} 
                  onChange={e => setNewLoc(s => ({...s, id: e.target.value}))} 
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-orange-600 focus:outline-none"
                  placeholder="МСК001 (авто, если пусто)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={()=>setShowAdd(false)} 
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                disabled={saving}
              >
                Отмена
              </button>
              <button 
                onClick={createLocation} 
                disabled={saving || !newLoc.name.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Создание...' : 'Создать объект'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Подтверждение удаления */}
      <ConfirmModal 
        open={confirm.open} 
        title={confirm.loc ? `Удалить объект "${confirm.loc.name}" и всю его технику?` : ''} 
        onCancel={()=>setConfirm({open:false, loc:null})} 
        onConfirm={()=>deleteLocation(confirm.loc)} 
      />
    </div>
  )
}