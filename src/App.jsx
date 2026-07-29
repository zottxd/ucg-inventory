import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Skeleton from './components/Skeleton'
import Auth from './Auth'
import { supabase, fetchPagedAssets } from './supabase'
import AdminPanel from './admin/AdminPanel'
import EquipmentTable from './components/EquipmentTable'
import ScrollToTop from './components/ScrollToTop'
import CookieConsent from './components/CookieConsent'

const PAGE_SIZE = 20
const CACHE_KEY = 'ucg_locations_cache'
const CACHE_TTL = 5 * 60 * 1000

function getCachedLocations(){
  if (typeof localStorage === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    const parsed = JSON.parse(cached)
    if (!parsed?.data || !parsed?.timestamp) return null
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null
    return parsed.data
  } catch (err) {
    return null
  }
}

function setCachedLocations(data){
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch (err) {
    // ignore localStorage write failures
  }
}

function AppContent(){
  const [query, setQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [locations, setLocations] = useState([])
  const [itAssets, setItAssets] = useState([])
  const [equipmentAssets, setEquipmentAssets] = useState([])
  const [itCount, setItCount] = useState(0)
  const [equipmentCount, setEquipmentCount] = useState(0)
  const [page, setPage] = useState({ it: 0, equipment: 0 })
  const assetsCache = useRef({})
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('it') // 'it' или 'equipment'

  const [user, setUser] = useState(window.__TEST_BYPASS__ ? { email: 'test@ucg.local', id: 'test' } : null)
  const [userRole, setUserRole] = useState(window.__TEST_BYPASS__ ? 'admin' : null)
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
      const cachedLocations = getCachedLocations()
      if (cachedLocations && cachedLocations.length) {
        setLocations(cachedLocations)
        setLoadingLocations(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, address')
          .order('name')
        
        if(error) throw error
        setLocations(data || [])
        setCachedLocations(data || [])
      } catch (err) {
        console.error('Ошибка загрузки объектов:', err)
        setError('Не удалось загрузить список объектов')
      } finally {
        setLoadingLocations(false)
      }
    }
    loadLocations()
  }, [])

  const fetchCachedPage = useCallback(async (type, locationId, pageIndex) => {
    const cacheKey = `${type}:${locationId}:${pageIndex}`
    if (assetsCache.current[cacheKey]) {
      return assetsCache.current[cacheKey]
    }

    const table = type === 'it' ? 'it_assets' : 'equipment_assets'
    const result = await fetchPagedAssets(table, locationId, pageIndex, PAGE_SIZE)
    if (!result.error) {
      assetsCache.current[cacheKey] = result
    }
    return result
  }, [])

  const loadAssets = useCallback(async (locationId) => {
    if (!locationId) {
      setItAssets([])
      setEquipmentAssets([])
      setItCount(0)
      setEquipmentCount(0)
      setPage({ it: 0, equipment: 0 })
      return
    }

    setLoadingAssets(true)
    setError('')

    try {
      const [itResult, equipmentResult] = await Promise.all([
        fetchCachedPage('it', locationId, 0),
        fetchCachedPage('equipment', locationId, 0),
      ])

      if (itResult.error) throw itResult.error
      if (equipmentResult.error) throw equipmentResult.error

      setItAssets(itResult.data ?? [])
      setItCount(itResult.count ?? 0)
      setEquipmentAssets(equipmentResult.data ?? [])
      setEquipmentCount(equipmentResult.count ?? 0)
      setPage({ it: 0, equipment: 0 })

      console.log('IT assets loaded:', itResult.data?.length ?? 0)
      console.log('Equipment assets loaded:', equipmentResult.data?.length ?? 0)
    } catch (err) {
      console.error('Ошибка загрузки техники:', err)
      setError('Не удалось загрузить технику для этого объекта')
    } finally {
      setLoadingAssets(false)
    }
  }, [fetchCachedPage])

  const loadAssetPage = useCallback(async (type, pageIndex) => {
    if (!selectedLocation?.id) return

    setLoadingAssets(true)
    setError('')

    try {
      const result = await fetchCachedPage(type, selectedLocation.id, pageIndex)
      if (result.error) throw result.error

      if (type === 'it') {
        setItAssets(result.data ?? [])
        setItCount(result.count ?? 0)
        setPage(prev => ({ ...prev, it: pageIndex }))
      } else {
        setEquipmentAssets(result.data ?? [])
        setEquipmentCount(result.count ?? 0)
        setPage(prev => ({ ...prev, equipment: pageIndex }))
      }
    } catch (err) {
      console.error('Ошибка загрузки страницы техники:', err)
      setError('Не удалось загрузить технику для этого объекта')
    } finally {
      setLoadingAssets(false)
    }
  }, [fetchCachedPage, selectedLocation?.id])

  useEffect(() => {
    if (selectedLocation?.id) {
      loadAssets(selectedLocation.id)
    } else {
      setItAssets([])
      setEquipmentAssets([])
      setItCount(0)
      setEquipmentCount(0)
      setPage({ it: 0, equipment: 0 })
    }
  }, [selectedLocation, loadAssets])

  const handleLocationSelect = useCallback((location) => {
    assetsCache.current = {}
    setSelectedLocation(location)
    setQuery(location.name)
  }, [])

  const handleQueryChange = useCallback((value) => {
    setQuery(value)
    if (!value) setSelectedLocation(null)
  }, [])

  const pageSuspenseFallback = (
    <Skeleton rows={10} cols={5} />
  )

  // Фильтрация техники на IT и Не-IT
  const itRows = itAssets
  const nonItRows = equipmentAssets

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <div className="text-xl font-semibold text-slate-900 dark:text-white">Загрузка...</div>
          <p className="mt-2 text-sm text-slate-500">Пожалуйста, подождите.</p>
        </div>
      </div>
    )
  }

  if (!user && !window.__TEST_BYPASS__) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    )
  }

  if (isAdminView && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 dark:text-white">
        <Header user={user} userRole={userRole} onLogout={handleLogout} />
        <main className="flex-1">
          <div className="max-w-[900px] mx-auto p-4 md:p-8">
            <div className="rounded-xl bg-red-50 p-4 md:p-8 shadow-sm border border-red-200">
              <h2 className="text-2xl font-bold text-red-700">⛔ Доступ запрещен</h2>
              <p className="mt-4 text-red-600">
                Только администраторы имеют доступ к этой странице.
              </p>
              <a
                href="#/"
                className="mt-6 inline-flex rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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

  // Если открыта Админка и пользователь — админ
  if (isAdminView) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 dark:text-white">
        <Header user={user} userRole={userRole} onLogout={handleLogout} />
        <main className="flex-1">
          <AdminPanel locations={locations} />
        </main>
        <Footer />
      </div>
    )
  }

  // Если открыт Каталог — показываем поиск и таблицы
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 dark:text-white">
      <Header user={user} userRole={userRole} onLogout={handleLogout} />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto p-4 md:p-8">
            <div className="bg-[#f8f9fa] dark:bg-slate-800 p-4 md:p-8 rounded shadow-sm">
              
              {/* Выбор объекта */}
              {!selectedLocation ? (
                <EquipmentTable
                  showLocationPicker
                  locations={locations}
                  locationQuery={query}
                  onLocationQueryChange={handleQueryChange}
                  onLocationSelect={handleLocationSelect}
                  rows={[]}
                />
              ) : null}

            {/* Сообщения об ошибках и загрузке */}
            {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
            
            {loadingLocations && <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">Загрузка объектов...</div>}
            {loadingAssets && selectedLocation && <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">Обновление данных...</div>}

            <div className="mt-6">
              {selectedLocation && (
                <div>
                  {/* Заголовок выбранного объекта */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 bg-white dark:bg-slate-900 p-4 rounded border border-gray-200 dark:border-slate-700">
                    <div>
                      <h2 className="text-xl font-bold text-blue-800">📍 {selectedLocation.name}</h2>
                      {selectedLocation.address && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedLocation.address}</p>
                      )}
                    </div>
                    <button 
                      onClick={()=>{ setSelectedLocation(null); setQuery(''); }} 
                      className="mt-3 sm:mt-0 text-sm px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 transition"
                    >
                      ✕ Сбросить выбор
                    </button>
                  </div>

                  {/* Табы: показываем только активную таблицу */}
                  <div>
                    <div className="flex gap-2 mb-4" data-ignore-autocomplete="true">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('it'); try { document.activeElement && document.activeElement.blur(); } catch{} }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`px-4 py-2 rounded font-medium transition ${
                          activeTab === 'it'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                        }`}
                      >
                        💻 IT ТЕХНИКА
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('equipment'); try { document.activeElement && document.activeElement.blur(); } catch{} }}
                        onMouseDown={(e) => e.preventDefault()}
                        className={`px-4 py-2 rounded font-medium transition ${
                          activeTab === 'equipment'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                        }`}
                      >
                        🏭 ОБОРУДОВАНИЕ
                      </button>
                    </div>

                    {activeTab === 'it' && (
                      <div className="mb-4">
                        {loadingAssets ? (
                          <Skeleton rows={6} cols={5} />
                        ) : (
                          <EquipmentTable title="💻 IT ТЕХНИКА" rows={itRows} />
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 mt-4">
                          <button
                            onClick={() => loadAssetPage('it', Math.max(0, page.it - 1))}
                            disabled={page.it === 0}
                            className="px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded disabled:opacity-50"
                          >
                            ← Назад
                          </button>
                          <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                            Страница {page.it + 1} из {Math.max(1, Math.ceil(itCount / PAGE_SIZE))}
                          </span>
                          <button
                            onClick={() => loadAssetPage('it', page.it + 1)}
                            disabled={(page.it + 1) * PAGE_SIZE >= itCount}
                            className="px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded disabled:opacity-50"
                          >
                            Вперёд →
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'equipment' && (
                      <div className="mb-4">
                        {loadingAssets ? (
                          <Skeleton rows={6} cols={5} />
                        ) : (
                          <EquipmentTable title="🏭 ОБОРУДОВАНИЕ" rows={nonItRows} />
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 mt-4">
                          <button
                            onClick={() => loadAssetPage('equipment', Math.max(0, page.equipment - 1))}
                            disabled={page.equipment === 0}
                            className="px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded disabled:opacity-50"
                          >
                            ← Назад
                          </button>
                          <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                            Страница {page.equipment + 1} из {Math.max(1, Math.ceil(equipmentCount / PAGE_SIZE))}
                          </span>
                          <button
                            onClick={() => loadAssetPage('equipment', page.equipment + 1)}
                            disabled={(page.equipment + 1) * PAGE_SIZE >= equipmentCount}
                            className="px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded disabled:opacity-50"
                          >
                            Вперёд →
                          </button>
                        </div>
                      </div>
                    )}
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

function App(){
  return (
    <>
      <AppContent />
      <ScrollToTop />
      <CookieConsent />
    </>
  )
}

// ЕДИНСТВЕННЫЙ экспорт (исправляет ошибку "Only one default export allowed")
export default App;