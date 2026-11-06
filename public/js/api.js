import { API_BASE, getAccessToken, getRefreshToken, setTokens, clearTokens } from './state.js'
import { showToast } from './ui.js'

// --- API WRAPPER WITH AUTOMATIC SILENT REFRESH ---
export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  options.headers = options.headers || {}
  if (!(options.body instanceof FormData)) {
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json'
  }

  const accessToken = getAccessToken()
  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    let response = await fetch(url, options)
    let data = await response.json()

    if (response.status === 401 && getRefreshToken()) {
      console.warn('Access token expired or invalid, attempting silent refresh...')
      const refreshed = await attemptTokenRefresh()
      if (refreshed) {
        options.headers['Authorization'] = `Bearer ${getAccessToken()}`
        response = await fetch(url, options)
        data = await response.json()
      } else {
        clearTokens()
        showToast('Your session has expired. Please log in again.', 'error')
        window.location.hash = '#/login'
        return { error: true, message: 'Session expired' }
      }
    }

    if (!response.ok) {
      return {
        error: true,
        status: response.status,
        message: data.message || 'Something went wrong',
        errors: data.errors || null
      }
    }

    return data
  } catch (err) {
    console.error('API Call error:', err)
    return { error: true, message: 'Network connection failed' }
  }
}

export async function attemptTokenRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_BASE}/users/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    })

    if (!response.ok) return false

    const data = await response.json()
    if (data.result && data.result.access_token && data.result.refresh_token) {
      setTokens(data.result.access_token, data.result.refresh_token)
      console.log('Tokens refreshed successfully.')
      return true
    }
    return false
  } catch (e) {
    console.error('Failed to refresh tokens:', e)
    return false
  }
}

