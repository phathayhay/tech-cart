import { isLoggedIn } from './state.js'
import { showToast, showMainHeader, hideMainHeader, showScreen } from './ui.js'
import { loadProducts } from './store-wheel.js'
import { fetchCart } from './cart.js'
import { loadHeaderUser, loadDashboardData, handleEmailVerification } from './dashboard.js'

// --- SPA ROUTER MODULE ---

export function getRouteParams() {
  const hash = window.location.hash || '#/'
  const qPos = hash.indexOf('?')
  if (qPos === -1) return { route: hash, query: {} }

  const route = hash.substring(0, qPos)
  const qStr = hash.substring(qPos + 1)
  const query = {}

  qStr.split('&').forEach((param) => {
    const parts = param.split('=')
    if (parts[0]) {
      query[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '')
    }
  })

  return { route, query }
}

export async function handleRoute() {
  const { route, query } = getRouteParams()
  const appContainer = document.querySelector('.app-container')
  if (!appContainer) return

  document.querySelectorAll('.screen').forEach((screen) => screen.classList.add('hidden'))
  const verifyBox = document.getElementById('email-verification-interception-box')
  if (verifyBox) verifyBox.classList.add('hidden')

  const authRoutes = ['#/login', '#/register', '#/forgot-password', '#/reset-password']
  if (authRoutes.includes(route) && !isLoggedIn()) {
    appContainer.classList.remove('store-mode', 'dashboard-mode')
    hideMainHeader()

    if (route === '#/register') {
      showScreen('register-screen')
    } else if (route === '#/forgot-password') {
      showScreen('forgot-password-screen')
    } else if (route === '#/reset-password') {
      const tokenInput = document.getElementById('reset-token-input')
      if (tokenInput) tokenInput.value = query.token || ''
      showScreen('reset-password-screen')
    } else {
      showScreen('login-screen')
    }
  } else if (route === '#/dashboard') {
    if (!isLoggedIn()) {
      showToast('Please log in to access your dashboard.', 'info')
      window.location.hash = '#/login'
      return
    }
    appContainer.classList.add('dashboard-mode')
    appContainer.classList.remove('store-mode')
    showMainHeader()
    showScreen('dashboard-screen')
    await loadDashboardData()
  } else if (route === '#/verify-email' && isLoggedIn()) {
    const token = query.token || ''
    await handleEmailVerification(token)
  } else if (route === '#/reset-password' && isLoggedIn()) {
    appContainer.classList.remove('store-mode', 'dashboard-mode')
    hideMainHeader()
    const tokenInput = document.getElementById('reset-token-input')
    if (tokenInput) tokenInput.value = query.token || ''
    showScreen('reset-password-screen')
  } else if (route === '#/login' || route === '#/register') {
    if (isLoggedIn()) {
      window.location.hash = '#/'
      return
    }
    window.location.hash = route === '#/login' ? '#/login' : '#/register'
  } else {
    // Default: Store view (#/)
    appContainer.classList.add('store-mode')
    appContainer.classList.remove('dashboard-mode')
    showMainHeader()
    showScreen('store-screen')
    await loadProducts()
    if (isLoggedIn()) {
      await fetchCart()
      await loadHeaderUser()
    }
  }

  if (window.lucide) window.lucide.createIcons()
}

