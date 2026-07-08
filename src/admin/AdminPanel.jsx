import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'

function sanitizeInput(str) {
  return String(str).replace(/[<>]/g, '').trim()
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

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
  const [activeTab, setActiveTab] = useState('it')

  const [editLocation, setEditLocation] = useState(null)
  const [locationSearch, setLocationSearch] = useState('')
  const debouncedLocationSearch = useDebounce(locationSearch, 300)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const locationDropdownRef = useRef(null)

  const [loadingLocations, setLoadingLocations] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [invalidRows, setInvalidRows] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      const { data: itData, error: itError } = await supabase
        .from('it_assets')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
      
      if(itError) throw itError
      
      const { data: eqData, error: eqError } = await supabase
        .from('equipment_assets')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
      
      if(eqError) throw eqError
      
      const cleanItData = (itData || []).filter(row => String(row?.serial || '').trim() !== '')
      const cleanEqData = (eqData || []).filter(row => String(row?.serial || '').trim() !== '')

      if ((itData?.length || 0) !== cleanItData.length || (eqData?.length || 0) !== cleanEqData.length) {
        setStatusMessage('Скрыты пустые строки без серийного номера')
      }

      setItAssets(cleanItData)
      setNonItAssets(cleanEqData)
      
      console.log('IT assets loaded:', cleanItData.length || 0)
      console.log('Equipment assets loaded:', cleanEqData.length || 0)
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
        name: sanitizeInput(newLoc.name), 
        address: sanitizeInput(newLoc.address)
      }
      if(newLoc.id.trim()) payload.id = sanitizeInput(newLoc.id)
      
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
    const updateRow = row => {
      // Ищем по _tempKey для новых строк, по id для существующих
      if (row._tempKey === id || row.id === id) {
        return {...row, [field]: value}
      }
      return row
    }

    if (type === 'it') {
      setItAssets(prev => prev.map(updateRow))
    } else {
      setNonItAssets(prev => prev.map(updateRow))
    }

    if (field === 'serial' && String(value).trim() !== '') {
      setInvalidRows(prev => prev.filter(item => item !== id))
    }
  }, [])

  // Добавление строки в IT таблицу
  function addItRow(){
    if(!editLocation?.id) return
    setItAssets(prev => [
      ...prev,
      {
        _tempKey: crypto.randomUUID(), // Уникальный ключ для React (НЕ для БД!)
        serial: "",
        category: "",
        model: "",
        quantity: "",
        notes: "",
        photo_url: null,
        location_id: Number(editLocation.id)
      }
    ])
  }

  // Добавление строки в таблицу оборудования
  function addNonItRow(){
    if(!editLocation?.id) return
    setNonItAssets(prev => [
      ...prev,
      {
        _tempKey: crypto.randomUUID(), // Уникальный ключ для React
        serial: "",
        category: "",
        model: "",
        quantity: "",
        notes: "",
        photo_url: null,
        location_id: Number(editLocation.id)
      }
    ])
  }

  // Удаление строки
  async function deleteRow(type, id){
    if (type === 'it') {
      setItAssets(prev => prev.filter(r => r.id !== id))
    } else {
      setNonItAssets(prev => prev.filter(r => r.id !== id))
    }
    
    if(!id || String(id).startsWith('new-')){
      setStatusMessage('🗑 Строка удалена')
      return
    }
    
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
      loadAssets(editLocation.id)
    }
  }

  // Загрузка фото
  const handlePhotoUpload = async (type, rowIndex, file) => {
    if (!file) return
    
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from("equipment-photos")
      .upload(fileName, file)
    
    if (error) {
      console.error("Upload error:", error)
      setErrorMessage(`❌ Ошибка загрузки фото: ${error.message}`)
      return
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from("equipment-photos")
      .getPublicUrl(fileName)
    
    const tableName = type === "it" ? "it_assets" : "equipment_assets"
    const rows = type === "it" ? itAssets : nonItAssets
    const setRows = type === "it" ? setItAssets : setNonItAssets
    
    const row = rows[rowIndex]
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ photo_url: publicUrl })
      .eq("id", row.id)
    
    if (updateError) {
      console.error("Update photo_url error:", updateError)
      setErrorMessage(`❌ Ошибка обновления URL фото: ${updateError.message}`)
      return
    }

    setRows(prev => {
      const updated = [...prev]
      updated[rowIndex] = { ...updated[rowIndex], photo_url: publicUrl }
      return updated
    })
    setStatusMessage("✅ Фото успешно загружено")
  }

  // Удаление фото
  const handlePhotoDelete = async (type, rowIndex, currentUrl) => {
    if (!currentUrl) return
    const fileName = currentUrl.split("/").pop()
    
    const { error: removeError } = await supabase.storage
      .from("equipment-photos")
      .remove([fileName])

    if (removeError) {
      console.error("Remove photo error:", removeError)
      setErrorMessage(`❌ Ошибка удаления фото из хранилища: ${removeError.message}`)
      return
    }
    
    const tableName = type === "it" ? "it_assets" : "equipment_assets"
    const rows = type === "it" ? itAssets : nonItAssets
    const setRows = type === "it" ? setItAssets : setNonItAssets
    
    const row = rows[rowIndex]
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ photo_url: null })
      .eq("id", row.id)
    
    if (updateError) {
      console.error("Update photo_url to null error:", updateError)
      setErrorMessage(`❌ Ошибка удаления URL фото из базы: ${updateError.message}`)
      return
    }

    setRows(prev => {
      const updated = [...prev]
      updated[rowIndex] = { ...updated[rowIndex], photo_url: null }
      return updated
    })
    setStatusMessage("✅ Фото успешно удалено")
  }

  // Сохранение изменений в базу
  const handleSave = async () => {
    if(!editLocation?.id) {
      setErrorMessage("❌ Выберите объект для редактирования")
      return
    }
    
    setSaving(true)
    setErrorMessage(null)
    setStatusMessage("")
    setInvalidRows([])
    
    try {
      const invalidItIds = itAssets.filter(r => !String(r.serial || "").trim()).map(r => r.id)
      const invalidEqIds = nonItAssets.filter(r => !String(r.serial || "").trim()).map(r => r.id)

      if (invalidItIds.length > 0 || invalidEqIds.length > 0) {
        setInvalidRows([...invalidItIds, ...invalidEqIds])
        setErrorMessage("Заполните серийный номер у всех строк перед сохранением.")
        setSaving(false)
        console.log("❌ Найдены пустые серийные номера:", invalidItIds, invalidEqIds)
        return
      }

      // === IT ТЕХНИКА ===
      const newITRows = itAssets.filter(row => !row.id)
      const existingITRows = itAssets.filter(row => row.id)
      
      let savedIT = []
      
      if (newITRows.length > 0) {
        const newPayload = newITRows.map(({_tempKey, ...row}) => ({
          serial: sanitizeInput(row.serial),
          category: sanitizeInput(row.category),
          model: sanitizeInput(row.model),
          notes: sanitizeInput(row.notes),
          photo_url: row.photo_url || null,
          quantity: String(sanitizeInput(row.quantity) || '1'),
          location_id: Number(editLocation.id)
        }))
        console.log('IT new payload:', newPayload)
        
        const { data: inserted, error: insertError } = await supabase
          .from("it_assets")
          .insert(newPayload)
          .select()
        
        if (insertError) throw insertError
        savedIT = [...savedIT, ...inserted]
      }
      
      if (existingITRows.length > 0) {
        const updatePayload = existingITRows.map(row => ({
          id: Number(row.id),
          serial: sanitizeInput(row.serial),
          category: sanitizeInput(row.category),
          model: sanitizeInput(row.model),
          notes: sanitizeInput(row.notes),
          photo_url: row.photo_url || null,
          quantity: String(sanitizeInput(row.quantity) || '1'),
          location_id: Number(editLocation.id)
        }))
        console.log('IT update payload:', updatePayload)
        
        const { data: updated, error: updateError } = await supabase
          .from("it_assets")
          .upsert(updatePayload, { onConflict: "id" })
          .select()
        
        if (updateError) throw updateError
        savedIT = [...savedIT, ...updated]
      }
      
      // === ОБОРУДОВАНИЕ ===
      const newEqRows = nonItAssets.filter(row => !row.id)
      const existingEqRows = nonItAssets.filter(row => row.id)
      
      let savedEq = []
      
      if (newEqRows.length > 0) {
        const newPayload = newEqRows.map(({_tempKey, ...row}) => ({
          serial: sanitizeInput(row.serial),
          category: sanitizeInput(row.category),
          model: sanitizeInput(row.model),
          notes: sanitizeInput(row.notes),
          photo_url: row.photo_url || null,
          quantity: String(sanitizeInput(row.quantity) || '1'),
          location_id: Number(editLocation.id)
        }))
        console.log('EQ new payload:', newPayload)
        
        const { data: inserted, error: insertError } = await supabase
          .from("equipment_assets")
          .insert(newPayload)
          .select()
        
        if (insertError) throw insertError
        savedEq = [...savedEq, ...inserted]
      }
      
      if (existingEqRows.length > 0) {
        const updatePayload = existingEqRows.map(row => ({
          id: Number(row.id),
          serial: sanitizeInput(row.serial),
          category: sanitizeInput(row.category),
          model: sanitizeInput(row.model),
          notes: sanitizeInput(row.notes),
          photo_url: row.photo_url || null,
          quantity: String(sanitizeInput(row.quantity) || '1'),
          location_id: Number(editLocation.id)
        }))
        console.log('EQ update payload:', updatePayload)
        
        const { data: updated, error: updateError } = await supabase
          .from("equipment_assets")
          .upsert(updatePayload, { onConflict: "id" })
          .select()
        
        if (updateError) throw updateError
        savedEq = [...savedEq, ...updated]
      }
      
      setItAssets(prev => {
        const newRows = prev.filter(r => !r.id) // Удаляем пустые новые строки
        return [...newRows, ...savedIT] // Добавляем сохранённые с реальными id
      })
      
      setNonItAssets(prev => {
        const newRows = prev.filter(r => !r.id) // Удаляем пустые новые строки
        return [...newRows, ...savedEq] // Добавляем сохранённые с реальными id
      })
      
      setStatusMessage("✅ Изменения сохранены")
      
    } catch (error) {
      console.error("Save error:", error)
      setErrorMessage(`❌ Ошибка сохранения: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="max-w-[1200px] mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-semibold mb-6 text-blue-800">⚙️ ПАНЕЛЬ АДМИНИСТРАТОРА</h1>

        {errorMessage && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">{errorMessage}</div>}
        {statusMessage && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded border border-green-200">{statusMessage}</div>}

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-4">✏️ Редактор техники</h2>
          
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-6">
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
              
              {showLocationDropdown && (
                <div className="absolute mt-1 max-h-60 overflow-y-auto rounded shadow-lg border border-gray-200 w-full bg-white z-50">
                  {filteredLocations.map(loc => (
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
                  
                  {filteredLocations.length === 0 && (
                    <div className="px-4 py-3 text-gray-500 text-center text-sm">
                      Ничего не найдено
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowAdd(true)}
              className="w-full md:w-auto px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
              disabled={saving}
            >
              ➕ Добавить
            </button>

            {editLocation && (
              <button
                onClick={() => setConfirm({open:true, loc: editLocation})}
                className="w-full md:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
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

                  {activeTab === 'it' && (
                    <div className="bg-white rounded-lg border shadow-sm mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                        <div className="flex items-center gap-2">
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
                        <>
                          <div className="md:hidden space-y-4">
                            {itAssets.map((r, index) => (
                              <div key={r._tempKey || r.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-600">Запись #{index + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => deleteRow("it", r.id)}
                                    className="text-red-500 p-2 rounded hover:bg-red-50"
                                  >
                                    🗑️
                                  </button>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Модель</label>
                                  <input
                                    type="text"
                                    value={r.model || ""}
                                    onChange={(e) => handleCellChange("it", r._tempKey || r.id, "model", e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Изображение устройства</label>
                                  {r.photo_url ? (
                                    <div className="relative group w-24 h-24">
                                      <img 
                                        src={r.photo_url} 
                                        alt="Equipment" 
                                        className="w-full h-full object-cover rounded cursor-pointer"
                                        onClick={() => setSelectedImage(r.photo_url)}
                                      />
                                      <button
                                        onClick={() => handlePhotoDelete("it", index, r.photo_url)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-blue-500 text-sm">
                                      📷 Загрузить
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handlePhotoUpload("it", index, e.target.files[0])}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Серийник *</label>
                                  <input
                                    type="text"
                                    value={r.serial || ""}
                                    onChange={(e) => handleCellChange("it", r._tempKey || r.id, "serial", e.target.value)}
                                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${invalidRows.includes(r.id) ? "ring-2 ring-red-500 border-red-500 bg-red-50" : ""}`}
                                    placeholder="Введите серийный номер"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Категория *</label>
                                  <input
                                    type="text"
                                    value={r.category || ""}
                                    onChange={(e) => handleCellChange("it", r._tempKey || r.id, "category", e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="IT: Ноутбук, ПК..."
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Кол-во</label>
                                  <input
                                    type="text"
                                    value={r.quantity ?? ''}
                                    onChange={(e) => handleCellChange("it", r._tempKey || r.id, "quantity", e.target.value)}
                                    className="w-full px-3 py-2 border rounded w-20"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr className="text-left text-gray-600 border-b">
                                  <th className="px-3 py-2">Модель</th>
                                  <th className="px-3 py-2">Фото</th>
                                  <th className="px-3 py-2">Серийник *</th>
                                  <th className="px-3 py-2">Категория *</th>
                                  <th className="px-3 py-2 w-16">Кол-во</th>
                                  <th className="px-3 py-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {itAssets.map((r, index) => (
                                  <tr key={r._tempKey || r.id} className="border-t hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={r.model || ""}
                                        onChange={(e) => handleCellChange("it", r._tempKey || r.id, "model", e.target.value)}
                                        className="px-3 py-2 border rounded"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      {r.photo_url ? (
                                        <div className="relative group">
                                          <img 
                                            src={r.photo_url} 
                                            alt="Equipment" 
                                            className="w-12 h-12 object-cover rounded cursor-pointer"
                                            onClick={() => setSelectedImage(r.photo_url)}
                                          />
                                          <button
                                            onClick={() => handlePhotoDelete("it", index, r.photo_url)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <label className="cursor-pointer text-blue-500 text-sm">
                                          📷 Загрузить
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handlePhotoUpload("it", index, e.target.files[0])}
                                            className="hidden"
                                          />
                                        </label>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <input 
                                        value={r.serial || ""} 
                                        onChange={e => handleCellChange("it", r._tempKey || r.id, "serial", e.target.value)} 
                                        className={`border rounded px-2 py-1 w-full md:w-32 min-w-[60px] focus:ring-1 focus:ring-orange-600 focus:outline-none ${invalidRows.includes(r.id) ? "ring-2 ring-red-500 border-red-500 bg-red-50" : ""}`}
                                        placeholder="DV-001"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input 
                                        type="text" 
                                        required 
                                        placeholder="Ноутбук" 
                                        value={r.category || ""} 
                                        onChange={e => handleCellChange("it", r._tempKey || r.id, "category", e.target.value)} 
                                        className="border rounded px-2 py-1 w-full md:w-36 min-w-[60px] focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                      />
                                      <div className="text-[10px] text-gray-400 mt-0.5">IT: Ноутбук, ПК...</div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <input 
                                        type="text"
                                        value={r.quantity ?? ''} 
                                        onChange={e => handleCellChange("it", r._tempKey || r.id, "quantity", e.target.value)} 
                                        className="border rounded px-2 py-1 w-full md:w-16 min-w-[60px] text-center focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button 
                                        onClick={() => deleteRow("it", r.id)} 
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
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'equipment' && (
                    <div className="bg-white rounded-lg border shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                        <div className="flex items-center gap-2">
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
                        <>
                          <div className="md:hidden space-y-4">
                            {nonItAssets.map((r, index) => (
                              <div key={r._tempKey || r.id} className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-600">Запись #{index + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => deleteRow("eq", r.id)}
                                    className="text-red-500 p-2 rounded hover:bg-red-50"
                                  >
                                    🗑️
                                  </button>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Модель</label>
                                  <input
                                    type="text"
                                    value={r.model || ""}
                                    onChange={(e) => handleCellChange("eq", r._tempKey || r.id, "model", e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Изображение устройства</label>
                                  {r.photo_url ? (
                                    <div className="relative group w-24 h-24">
                                      <img 
                                        src={r.photo_url} 
                                        alt="Equipment" 
                                        className="w-full h-full object-cover rounded cursor-pointer"
                                        onClick={() => setSelectedImage(r.photo_url)}
                                      />
                                      <button
                                        onClick={() => handlePhotoDelete("eq", index, r.photo_url)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 text-blue-500 text-sm">
                                      📷 Загрузить
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handlePhotoUpload("eq", index, e.target.files[0])}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Серийник *</label>
                                  <input
                                    type="text"
                                    value={r.serial || ""}
                                    onChange={(e) => handleCellChange("eq", r._tempKey || r.id, "serial", e.target.value)}
                                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none ${invalidRows.includes(r.id) ? "ring-2 ring-red-500 border-red-500 bg-red-50" : ""}`}
                                    placeholder="Введите серийный номер"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Категория *</label>
                                  <input
                                    type="text"
                                    value={r.category || ""}
                                    onChange={(e) => handleCellChange("eq", r._tempKey || r.id, "category", e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Оборуд.: Стол, Стул..."
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Кол-во</label>
                                  <input
                                    type="text"
                                    value={r.quantity ?? ''}
                                    onChange={(e) => handleCellChange("eq", r._tempKey || r.id, "quantity", e.target.value)}
                                    className="w-full px-3 py-2 border rounded w-20"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50">
                                <tr className="text-left text-gray-600 border-b">
                                  <th className="px-3 py-2">Модель</th>
                                  <th className="px-3 py-2">Фото</th>
                                  <th className="px-3 py-2">Серийник *</th>
                                  <th className="px-3 py-2">Категория *</th>
                                  <th className="px-3 py-2 w-16">Кол-во</th>
                                  <th className="px-3 py-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {nonItAssets.map((r, index) => (
                                  <tr key={r._tempKey || r.id} className="border-t hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={r.model || ""}
                                        onChange={(e) => handleCellChange("eq", r._tempKey || r.id, "model", e.target.value)}
                                        className="px-3 py-2 border rounded"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      {r.photo_url ? (
                                        <div className="relative group">
                                          <img 
                                            src={r.photo_url} 
                                            alt="Equipment" 
                                            className="w-12 h-12 object-cover rounded cursor-pointer"
                                            onClick={() => setSelectedImage(r.photo_url)}
                                          />
                                          <button
                                            onClick={() => handlePhotoDelete("eq", index, r.photo_url)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <label className="cursor-pointer text-blue-500 text-sm">
                                          📷 Загрузить
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handlePhotoUpload("eq", index, e.target.files[0])}
                                            className="hidden"
                                          />
                                        </label>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      <input 
                                        value={r.serial || ""} 
                                        onChange={e => handleCellChange("eq", r._tempKey || r.id, "serial", e.target.value)} 
                                        className={`border rounded px-2 py-1 w-full md:w-32 min-w-[60px] focus:ring-1 focus:ring-orange-600 focus:outline-none ${invalidRows.includes(r.id) ? "ring-2 ring-red-500 border-red-500 bg-red-50" : ""}`}
                                        placeholder="FR-001"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input 
                                        type="text" 
                                        required 
                                        placeholder="Холодильник" 
                                        value={r.category || ""} 
                                        onChange={e => handleCellChange("eq", r._tempKey || r.id, "category", e.target.value)} 
                                        className="border rounded px-2 py-1 w-full md:w-36 min-w-[60px] focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                      />
                                      <div className="text-[10px] text-gray-400 mt-0.5">Оборуд.: Стол, Стул...</div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <input 
                                        type="text"
                                        value={r.quantity ?? ''} 
                                        onChange={e => handleCellChange("eq", r._tempKey || r.id, "quantity", e.target.value)} 
                                        className="border rounded px-2 py-1 w-full md:w-16 min-w-[60px] text-center focus:ring-1 focus:ring-orange-600 focus:outline-none"
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button 
                                        onClick={() => deleteRow("eq", r.id)} 
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
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {editLocation && (itAssets.length > 0 || nonItAssets.length > 0) && (
                <div className="mt-6">
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="w-full md:w-auto sticky bottom-4 z-20 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-[90vh] rounded"
          />
        </div>
      )}

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

      <ConfirmModal 
        open={confirm.open} 
        title={confirm.loc ? `Удалить объект "${confirm.loc.name}" и всю его технику?` : ''} 
        onCancel={()=>setConfirm({open:false, loc:null})} 
        onConfirm={()=>deleteLocation(confirm.loc)} 
      />
    </div>
  )
}