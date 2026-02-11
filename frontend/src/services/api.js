const API_URL = 'http://localhost:3333'

export const ROUTES = {
  LOGIN: `${API_URL}/api/login`,
  LOGOUT: `${API_URL}/api/logout`,
  ME: `${API_URL}/api/me`,
  USERS: `${API_URL}/api/users`,
  CLIENTS: `${API_URL}/api/clients`,
}

// Guardar datos de autenticación
export function saveAuthData(data) {
  localStorage.setItem('token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
}

// Obtener token
export function getToken() {
  return localStorage.getItem('token')
}

// Fetch con autenticación
export async function authFetch(url, options = {}) {
  const token = getToken()
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  
  return response
}

// Verificar autenticación
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

// Login
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

// Logout
export async function logout() {
  try {
    await authFetch(ROUTES.LOGOUT, { method: 'POST' })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
}