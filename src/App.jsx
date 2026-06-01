import React, { useState, useMemo, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import SearchAutocomplete from './components/SearchAutocomplete'
import EquipmentTable from './components/EquipmentTable'
import AdminPanel from './admin/AdminPanel'
import Auth from './Auth'
import { supabase } from './supabase'

// Списки категорий для разделения техники
const IT_CATEGORIES = ['Ноутбук','Компьютер','Монитор','Принтер','Сканер','Телефон','Роутер','Сервер','Планшет']
// Все остальные категории считаем "Оборудованием"

function App(){
  const [query, setQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [locations, setLocations] = useState([])
  const [assets, setAssets] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [error, setError] = useState('')

  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const fetchUserRole = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      console.log('Profile query result for', email, 'id=', userId, data, error)

      if (error && error.code !== 'PGRST116') {
        console.error('Ошибка запроса profiles:', error)
      }

      let role = data?.role || null

      if (!role) {
        if (email === 'admin@inventory.app') {
          role = 'admin'
          console.log('Fallback admin role applied for', email)
        } else {
          role = 'user'
          console.log('Fallback user role applied for', email)
        }

        try {
          await supabase.from('profiles').upsert({
            id: userId,
            email,
            role,
          })
        } catch (insertError) {
          console.error('Ошибка записи профиля при fallback:', insertError)
        }
      }

      // TEMP DEBUG: force admin role
      // if (email === 'admin@inventory.app') setUserRole('admin')

      setUserRole(role)
      console.log('User role:', role)
      return role
    } catch (err) {
      console.error('Ошибка загрузки роли пользователя:', err)
      if (email === 'admin@inventory.app') {
        setUserRole('admin')
        return 'admin'
      }
      setUserRole(null)
      return null
    }
  }

  const handleLogout = async () => {
    setAuthLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    setIsAdminView(false)
    window.location.hash = '#/'
    setAuthLoading(false)
  }

  const handleAuthSuccess = async (signedUser) => {
    setUser(signedUser)
    await fetchUserRole(signedUser.id, signedUser.email)
  }

  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Ошибка получения сессии:', error)
          setAuthError('Не удалось получить состояние аутентификации')
        }

        if (data?.session?.user) {
          setUser(data.session.user)
          await fetchUserRole(data.session.user.id, data.session.user.email)
        } else {
          setUser(null)
          setUserRole(null)
        }
      } finally {
        setAuthLoading(false)
      }
    }

    initAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserRole(session.user.id, session.user.email)
      } else {
        setUser(null)
        setUserRole(null)
      }
    })

    return () => authListener?.subscription?.unsubscribe?.()
  }, [])

  // Определяем текущий вид (Каталог или Админка) по хешу в URL
  const [isAdminView, setIsAdminView] = useState(window.location.hash === '#/admin')

  // Слушаем изменения хеша (#/admin или #/) для переключения страниц
  useEffect(()=>{
    const handleHash = () => setIsAdminView(window.location.hash === '#/admin')
    window.addEventListener('hashchange', handleHash)
    handleHash() // проверка при первой загрузке
    return ()=> window.removeEventListener('hashchange', handleHash)
  },[])

  // Загрузка списка объектов (локаций) при старте
  useEffect(() => {
    async function loadLocations(){
      setLoadingLocations(true)
      setError('')
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, address')
          .order('name')
        
        if(error) throw error
        setLocations(data || [])
      } catch (err) {
        console.error('Ошибка загрузки объектов:', err)
        setError('Не удалось загрузить список объектов')
      } finally {
        setLoadingLocations(false)
      }
    }
    loadLocations()
  }, [])

  // Загрузка техники при выборе объекта
  useEffect(() => {
    async function loadAssets(locationId){
      if (!locationId) {
        setAssets([])
        return
      }
      
      setLoadingAssets(true)
      setError('')
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
        
        // Merge both arrays for display
        const allAssets = [...(itData || []), ...(eqData || [])]
        setAssets(allAssets)
        
        console.log('IT assets loaded:', itData?.length || 0)
        console.log('Equipment assets loaded:', eqData?.length || 0)
        
      } catch (err) {
        console.error('Ошибка загрузки техники:', err)
        setError('Не удалось загрузить технику для этого объекта')
      } finally {
        setLoadingAssets(false)
      }
    }

    if(selectedLocation?.id){
      loadAssets(selectedLocation.id)
    } else {
      setAssets([])
    }
  }, [selectedLocation])

  // Обработчик выбора объекта из поиска
  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
    setQuery(location.name) // Показываем имя выбранного объекта в поле поиска
  }

  // Обработчик ввода в поиск (сброс выбора)
  const handleQueryChange = (value) => {
    setQuery(value)
    if (!value) setSelectedLocation(null)
  }

  // Фильтрация техники на IT и Не-IT
  const itRows = useMemo(() => {
    if(!selectedLocation) return []
    return assets.filter(a => IT_CATEGORIES.includes(a.category))
  }, [assets, selectedLocation])

  const nonItRows = useMemo(() => {
    if(!selectedLocation) return []
    return assets.filter(a => !IT_CATEGORIES.includes(a.category))
  }, [assets, selectedLocation])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-xl font-semibold text-slate-900">Загрузка...</div>
          <p className="mt-2 text-sm text-slate-500">Пожалуйста, подождите.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    )
  }

  if (isAdminView && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header user={user} userRole={userRole} onLogout={handleLogout} />
        <main className="flex-1">
          <div className="max-w-[900px] mx-auto p-6">
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Доступ запрещён</h2>
              <p className="mt-4 text-slate-600">
                Для просмотра этой страницы требуется роль администратора.
              </p>
              <a
                href="#/"
                className="mt-6 inline-flex rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Вернуться в каталог
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Если открыта Админка — передаем туда данные и функции обновления
  if (isAdminView) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header user={user} userRole={userRole} onLogout={handleLogout} />
        <main className="flex-1">
          <AdminPanel 
            locations={locations} 
            assets={assets} 
            setAssets={setAssets}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
          />
        </main>
        <Footer />
      </div>
    )
  }

  // Если открыт Каталог — показываем поиск и таблицы
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header user={user} userRole={userRole} onLogout={handleLogout} />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto p-6">
          <div className="bg-[#f8f9fa] p-8 rounded shadow-sm">
            
            {/* Компонент поиска */}
            <SearchAutocomplete
              value={query}
              onChange={handleQueryChange}
              onSelect={handleLocationSelect}
              locations={locations}
              placeholder="Введите название объекта..."
            />

            {/* Сообщения об ошибках и загрузке */}
            {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
            
            {loadingLocations && <div className="mt-4 text-sm text-gray-600">Загрузка объектов...</div>}
            {loadingAssets && selectedLocation && <div className="mt-4 text-sm text-gray-600">Загрузка техники...</div>}

            <div className="mt-6">
              {!selectedLocation ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-lg">🔍 Введите название объекта, чтобы посмотреть инвентарь</p>
                  <p className="text-sm mt-2">Например: "Двинцев", "АвтоВАЗ", "Спортмастер"</p>
                </div>
              ) : (
                <div>
                  {/* Заголовок выбранного объекта */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 bg-white p-4 rounded border">
                    <div>
                      <h2 className="text-xl font-bold text-blue-800">📍 {selectedLocation.name}</h2>
                      {selectedLocation.address && (
                        <p className="text-sm text-gray-500 mt-1">{selectedLocation.address}</p>
                      )}
                    </div>
                    <button 
                      onClick={()=>{ setSelectedLocation(null); setQuery(''); }} 
                      className="mt-3 sm:mt-0 text-sm px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                    >
                      ✕ Сбросить выбор
                    </button>
                  </div>

                  {/* Две таблицы: IT и Оборудование */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <EquipmentTable title="💻 IT ТЕХНИКА" rows={itRows} />
                    <EquipmentTable title="🏭 ОБОРУДОВАНИЕ" rows={nonItRows} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ЕДИНСТВЕННЫЙ экспорт (исправляет ошибку "Only one default export allowed")
export default App;