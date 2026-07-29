import React, { useState } from 'react'
import { supabase } from './supabase'

const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION = 60000 // 1 minute

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockUntil, setLockUntil] = useState(null)

  const resetFeedback = () => {
    setError('')
    setMessage('')
  }

  const handleSignIn = async (event) => {
    event.preventDefault()
    resetFeedback()

    if (lockUntil && Date.now() < lockUntil) {
      const secondsRemaining = Math.ceil((lockUntil - Date.now()) / 1000)
      setError(`Слишком много неудачных попыток. Подождите ${secondsRemaining} сек`)
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    })

    setLoading(false)

    if (error) {
      const attempts = loginAttempts + 1
      setLoginAttempts(attempts)
      
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        setLockUntil(Date.now() + LOCK_DURATION)
        setError(`Аккаунт заблокирован на ${LOCK_DURATION / 1000} сек из-за множественных неудачных попыток`)
        setLoginAttempts(0)
      } else {
        const remaining = MAX_LOGIN_ATTEMPTS - attempts
        setError(`${error.message || 'Не удалось войти в систему'}. Осталось попыток: ${remaining}`)
      }
      return
    }

    // Reset on successful login
    setLoginAttempts(0)
    setLockUntil(null)

    if (data?.user) {
      onAuthSuccess?.(data.user)
    }
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    resetFeedback()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    })

    setLoading(false)

    if (error) {
      setError(error.message || 'Не удалось зарегистрироваться')
      return
    }

    if (data?.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: 'user',
        })
      } catch (profileError) {
        console.warn('Не удалось сохранить профиль пользователя:', profileError)
      }
    }

    setMessage('Успешно! Проверьте почту для подтверждения входа.')
    setMode('signin')
  }

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">UCG Inventory</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Корпоративная система учета техники</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
        <label className="block">
          <span className="text-sm text-slate-600">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Обработка...'
            : mode === 'signin'
            ? 'Войти'
            : 'Зарегистрироваться'}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-slate-600">
        {mode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            resetFeedback()
          }}
          className="font-medium text-slate-900 underline"
        >
          {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </div>
    </div>
  )
}
