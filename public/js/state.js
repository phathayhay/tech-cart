// API Base URL & Global App State
export const API_BASE = 'http://localhost:3000'

export const appState = {
  user: null,
  activeTab: 'tab-overview',
  products: [],
  selectedProductIndex: 0,
  showcaseQty: 1,
  wheelRotation: Math.PI,
  wheelTargetRotation: Math.PI,
  wheelAnimFrame: null,
  wheelInitialized: false,
  cart: { items: [], total: 0 },
  orders: [],
  cartDrawerOpen: false
}

// --- AUTH TOKEN HELPERS ---
export const getAccessToken = () => localStorage.getItem('access_token')
export const getRefreshToken = () => localStorage.getItem('refresh_token')

export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export const isLoggedIn = () => Boolean(getAccessToken())

