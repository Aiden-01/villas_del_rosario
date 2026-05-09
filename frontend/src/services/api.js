const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export const ROUTES = {
  LOGIN: `${API_URL}/api/login`,
  REFRESH: `${API_URL}/api/refresh`,
  LOGOUT: `${API_URL}/api/logout`,
  ME: `${API_URL}/api/me`,
  USERS: `${API_URL}/api/users`,
  CLIENTS: `${API_URL}/api/clientes`,
}

export function saveAuthData(data) {
  localStorage.setItem('token', data.token)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('user', JSON.stringify(data.user))
}

export function getToken() {
  return localStorage.getItem('token')
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

export function clearAuthData() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

async function refreshSession() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const response = await fetch(ROUTES.REFRESH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    clearAuthData()
    return null
  }

  saveAuthData(data)
  return data.token
}

export async function authFetch(url, options = {}) {
  const token = getToken()
  const requestOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  }

  const response = await fetch(url, requestOptions)
  if (response.status !== 401) return response

  const newToken = await refreshSession()
  if (!newToken) return response

  return fetch(url, {
    ...requestOptions,
    headers: {
      ...requestOptions.headers,
      Authorization: `Bearer ${newToken}`,
    },
  })
}

export async function checkAuth() {
  try {
    const response = await authFetch(ROUTES.ME)
    if (response.ok) {
      const data = await response.json()
      return { authenticated: true, user: data.user }
    }
    return { authenticated: false }
  } catch {
    return { authenticated: false }
  }
}

export async function login(username, password) {
  const response = await fetch(ROUTES.LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Error en login')
  }

  saveAuthData(data)
  return data
}

export async function logout() {
  try {
    await authFetch(ROUTES.LOGOUT, {
      method: 'POST',
      body: JSON.stringify({ refreshToken: getRefreshToken() }),
    })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    clearAuthData()
    window.location.href = '/login'
  }
}
