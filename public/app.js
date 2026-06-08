// API Base URL
const API_BASE = 'http://localhost:3000'

// Global App State
let appState = {
  user: null,
  activeTab: 'tab-overview',
  products: [],
  cart: { items: [], total: 0 },
  orders: [],
  cartDrawerOpen: false
}

// --- AUTH TOKEN HELPERS ---
const getAccessToken = () => localStorage.getItem('access_token')
const getRefreshToken = () => localStorage.getItem('refresh_token')

const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

const isLoggedIn = () => {
  return !!getAccessToken()
}

// --- FORMAT HELPERS ---
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatPaymentMethod(method) {
  const labels = {
    cod: 'COD',
    card: 'Mock Card',
    bank_transfer: 'Bank Transfer'
  }
  return labels[method] || 'COD'
}

function formatPaymentStatus(status) {
  const labels = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded'
  }
  return labels[status] || 'Pending'
}

function getCartItemCount() {
  if (!appState.cart || !appState.cart.items) return 0
  return appState.cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge')
  const count = getCartItemCount()
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count
    badge.classList.remove('hidden')
  } else {
    badge.classList.add('hidden')
  }
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`

  let icon = 'info'
  if (type === 'success') icon = 'check-circle'
  if (type === 'error') icon = 'alert-triangle'

  toast.innerHTML = `
    <i data-lucide="${icon}" class="toast-icon"></i>
    <div class="toast-content">${message}</div>
  `

  container.appendChild(toast)
  lucide.createIcons() // render icon

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    setTimeout(() => {
      toast.remove()
    }, 300)
  }, 4000)
}

// --- API WRAPPER WITH AUTOMATIC REFRESH ---
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  // Prepare headers
  options.headers = options.headers || {}
  if (!(options.body instanceof FormData)) {
    options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json'
  }

  // Attach Access Token if available
  const accessToken = getAccessToken()
  if (accessToken) {
    options.headers['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    let response = await fetch(url, options)
    let data = await response.json()

    // Check if token is expired or unauthorized
    if (response.status === 401 && getRefreshToken()) {
      console.warn('Access token expired or invalid, attempting silent refresh...')

      // Attempt silent refresh
      const refreshed = await attemptTokenRefresh()
      if (refreshed) {
        // Retry original request with new access token
        options.headers['Authorization'] = `Bearer ${getAccessToken()}`
        response = await fetch(url, options)
        data = await response.json()
      } else {
        // Refresh failed, logout
        clearTokens()
        showToast('Your session has expired. Please log in again.', 'error')
        window.location.hash = '#/login'
        return { error: true, message: 'Session expired' }
      }
    }

    if (!response.ok) {
      // Return custom structured error object
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

// Perform token refresh call
async function attemptTokenRefresh() {
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

// --- SPA ROUTER ---
function getRouteParams() {
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

async function handleRoute() {
  const { route, query } = getRouteParams()
  const appContainer = document.querySelector('.app-container')

  // Hide all screens
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.add('hidden'))
  const verifyBox = document.getElementById('email-verification-interception-box')
  if (verifyBox) verifyBox.classList.add('hidden')

  // Public auth routes
  const authRoutes = ['#/login', '#/register', '#/forgot-password', '#/reset-password']
  if (authRoutes.includes(route) && !isLoggedIn()) {
    appContainer.classList.remove('store-mode', 'dashboard-mode')
    hideMainHeader()

    if (route === '#/register') {
      showScreen('register-screen')
    } else if (route === '#/forgot-password') {
      showScreen('forgot-password-screen')
    } else if (route === '#/reset-password') {
      document.getElementById('reset-token-input').value = query.token || ''
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
    document.getElementById('reset-token-input').value = query.token || ''
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

  lucide.createIcons()
}

function showMainHeader() {
  const header = document.getElementById('main-header')
  header.classList.remove('hidden')
  const loggedIn = isLoggedIn()
  document.getElementById('header-logged-in').classList.toggle('hidden', !loggedIn)
  document.getElementById('header-guest').classList.toggle('hidden', loggedIn)
}

function hideMainHeader() {
  document.getElementById('main-header').classList.add('hidden')
}

async function loadHeaderUser() {
  if (!isLoggedIn()) return
  const response = await apiCall('/users/me', { method: 'POST' })
  if (response.error) return
  const user = response.result
  appState.user = user
  document.getElementById('header-username').textContent = user.name || 'User'
  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
  document.getElementById('header-avatar').src = user.avatar || defaultAvatar
}

function showScreen(screenId) {
  document.getElementById(screenId).classList.remove('hidden')
}

// --- STORE & CART ---

async function loadProducts() {
  const grid = document.getElementById('products-grid')
  const loading = document.getElementById('products-loading')
  const empty = document.getElementById('products-empty')

  loading.classList.remove('hidden')
  empty.classList.add('hidden')
  grid.innerHTML = ''

  const response = await apiCall('/products', { method: 'GET' })

  loading.classList.add('hidden')

  if (response.error) {
    showToast(response.message, 'error')
    empty.classList.remove('hidden')
    return
  }

  appState.products = response.result || []
  if (appState.products.length === 0) {
    empty.classList.remove('hidden')
    return
  }

  renderProducts()
}

function renderProducts() {
  const grid = document.getElementById('products-grid')
  grid.innerHTML = appState.products
    .map((product) => {
      const id = product._id
      const discount =
        product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0
      const stockClass = product.stock <= 5 ? 'low' : ''

      return `
      <article class="product-card" data-product-id="${id}">
        <div class="product-image-wrapper">
          <img src="${product.image_url}" alt="${product.name}" class="product-image" loading="lazy">
          <span class="product-category-badge">${product.category}</span>
        </div>
        <div class="product-body">
          <span class="product-brand">${product.brand}</span>
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description}</p>
          <div class="product-meta">
            <span class="product-rating"><i data-lucide="star"></i> ${product.rating || 4.5}</span>
            <span class="product-stock ${stockClass}">${product.stock} in stock</span>
          </div>
          <div class="product-footer">
            <div class="product-price">
              <span class="product-price-current">${formatCurrency(product.price)}</span>
              ${discount > 0 ? `<span class="product-price-original">${formatCurrency(product.original_price)} (-${discount}%)</span>` : ''}
            </div>
            <button class="btn btn-primary btn-sm add-to-cart-btn" data-product-id="${id}" ${product.stock === 0 ? 'disabled' : ''}>
              <i data-lucide="plus"></i> Add
            </button>
          </div>
        </div>
      </article>
    `
    })
    .join('')

  grid.querySelectorAll('.add-to-cart-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleAddToCart(btn.dataset.productId))
  })

  lucide.createIcons()
}

async function handleAddToCart(productId) {
  if (!isLoggedIn()) {
    showToast('Please log in to add items to your cart.', 'info')
    window.location.hash = '#/login'
    return
  }

  showToast('Adding to cart...', 'info')
  const response = await apiCall('/cart/add', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: 1 })
  })

  if (response.error) {
    showToast(response.message, 'error')
    return
  }

  appState.cart = response.result
  updateCartBadge()
  renderCartDrawer()
  showToast('Added to cart!', 'success')
  openCartDrawer()
}

async function fetchCart() {
  if (!isLoggedIn()) {
    appState.cart = { items: [], total: 0 }
    updateCartBadge()
    return
  }

  const response = await apiCall('/cart', { method: 'GET' })
  if (response.error) {
    appState.cart = { items: [], total: 0 }
  } else {
    appState.cart = response.result
  }
  updateCartBadge()
  renderCartDrawer()
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container')
  const emptyState = document.getElementById('cart-empty-state')
  const totalEl = document.getElementById('cart-total-amount')
  const checkoutBtn = document.getElementById('checkout-btn')
  const items = appState.cart?.items || []

  container.querySelectorAll('.cart-item').forEach((el) => el.remove())

  if (items.length === 0) {
    emptyState.classList.remove('hidden')
    totalEl.textContent = formatCurrency(0)
    checkoutBtn.disabled = true
    return
  }

  emptyState.classList.add('hidden')
  checkoutBtn.disabled = false
  totalEl.textContent = formatCurrency(appState.cart.total || 0)

  items.forEach((item) => {
    const productId = typeof item.product_id === 'object' ? item.product_id.toString() : item.product_id
    const el = document.createElement('div')
    el.className = 'cart-item'
    el.innerHTML = `
      <img src="${item.image_url}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">${formatCurrency(item.price)}</span>
        <div class="cart-item-controls">
          <button class="qty-btn qty-decrease" data-product-id="${productId}" title="Decrease">
            <i data-lucide="minus"></i>
          </button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button class="qty-btn qty-increase" data-product-id="${productId}" title="Increase">
            <i data-lucide="plus"></i>
          </button>
          <button class="cart-item-remove" data-product-id="${productId}" title="Remove">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `
    container.appendChild(el)
  })

  container.querySelectorAll('.qty-decrease').forEach((btn) => {
    btn.addEventListener('click', () => updateCartQuantity(btn.dataset.productId, -1))
  })
  container.querySelectorAll('.qty-increase').forEach((btn) => {
    btn.addEventListener('click', () => updateCartQuantity(btn.dataset.productId, 1))
  })
  container.querySelectorAll('.cart-item-remove').forEach((btn) => {
    btn.addEventListener('click', () => removeCartItem(btn.dataset.productId))
  })

  lucide.createIcons()
}

async function updateCartQuantity(productId, delta) {
  const item = appState.cart.items.find((i) => {
    const id = typeof i.product_id === 'object' ? i.product_id.toString() : i.product_id
    return id === productId
  })
  if (!item) return

  const newQty = item.quantity + delta
  if (newQty <= 0) {
    await removeCartItem(productId)
    return
  }

  const response = await apiCall('/cart/update', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: newQty })
  })

  if (response.error) {
    showToast(response.message, 'error')
    return
  }

  appState.cart = response.result
  updateCartBadge()
  renderCartDrawer()
}

async function removeCartItem(productId) {
  const response = await apiCall(`/cart/remove/${productId}`, { method: 'DELETE' })
  if (response.error) {
    showToast(response.message, 'error')
    return
  }
  appState.cart = response.result
  updateCartBadge()
  renderCartDrawer()
  showToast('Item removed from cart.', 'info')
}

async function handleCheckout() {
  if (!isLoggedIn()) {
    showToast('Please log in to checkout.', 'info')
    window.location.hash = '#/login'
    return
  }

  if (!appState.cart.items || appState.cart.items.length === 0) {
    showToast('Your cart is empty.', 'error')
    return
  }

  const payment_method = document.getElementById('checkout-payment-method').value
  const shipping_address = document.getElementById('checkout-shipping-address').value.trim()
  const note = document.getElementById('checkout-note').value.trim()

  if (!shipping_address) {
    showToast('Please enter your shipping address before checkout.', 'error')
    return
  }

  showToast('Processing checkout...', 'info')
  const response = await apiCall('/orders', {
    method: 'POST',
    body: JSON.stringify({
      payment_method,
      shipping_address,
      note
    })
  })

  if (response.error) {
    showToast(response.message, 'error')
    return
  }

  appState.cart = { items: [], total: 0 }
  document.getElementById('checkout-shipping-address').value = ''
  document.getElementById('checkout-note').value = ''
  document.getElementById('checkout-payment-method').value = 'cod'
  updateCartBadge()
  renderCartDrawer()
  closeCartDrawer()
  showToast('Order placed successfully!', 'success')

  if (window.location.hash === '#/dashboard') {
    await loadOrders()
    document.querySelector('.nav-tab[data-tab="tab-orders"]')?.click()
  } else {
    showToast('View your orders in the Dashboard.', 'info')
  }
}

function openCartDrawer() {
  appState.cartDrawerOpen = true
  document.getElementById('cart-drawer').classList.add('open')
  const overlay = document.getElementById('cart-overlay')
  overlay.classList.remove('hidden')
  requestAnimationFrame(() => overlay.classList.add('visible'))
}

function closeCartDrawer() {
  appState.cartDrawerOpen = false
  document.getElementById('cart-drawer').classList.remove('open')
  const overlay = document.getElementById('cart-overlay')
  overlay.classList.remove('visible')
  setTimeout(() => overlay.classList.add('hidden'), 300)
}

async function loadOrders() {
  const loading = document.getElementById('orders-loading')
  const empty = document.getElementById('orders-empty')
  const tableWrapper = document.getElementById('orders-table-wrapper')
  const tbody = document.getElementById('orders-table-body')

  loading.classList.remove('hidden')
  empty.classList.add('hidden')
  tableWrapper.classList.add('hidden')

  const response = await apiCall('/orders', { method: 'GET' })
  loading.classList.add('hidden')

  if (response.error) {
    showToast(response.message, 'error')
    empty.classList.remove('hidden')
    return
  }

  appState.orders = response.result || []
  if (appState.orders.length === 0) {
    empty.classList.remove('hidden')
    return
  }

  tableWrapper.classList.remove('hidden')
  tbody.innerHTML = appState.orders
    .map((order) => {
      const orderId = typeof order._id === 'object' ? order._id.toString() : order._id
      const shortId = orderId.slice(-8).toUpperCase()
      const date = new Date(order.created_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)
      const statusClass = `order-status-${order.status || 'pending'}`
      const paymentStatus = order.payment_status || 'pending'
      const paymentClass = `payment-status-${paymentStatus}`

      return `
      <tr>
        <td>#${shortId}</td>
        <td>${date}</td>
        <td>${itemCount} item(s)</td>
        <td>${formatCurrency(order.total_amount)}</td>
        <td>
          <span class="payment-method">${formatPaymentMethod(order.payment_method)}</span>
          <span class="payment-status-badge ${paymentClass}">${formatPaymentStatus(paymentStatus)}</span>
        </td>
        <td><span class="order-status-badge ${statusClass}">${order.status || 'pending'}</span></td>
      </tr>
    `
    })
    .join('')
}

// --- CONTROLLERS & DATA LOADING ---

async function loadDashboardData() {
  const response = await apiCall('/users/me', { method: 'POST' })
  if (response.error) {
    showToast(response.message, 'error')
    if (response.status === 401) {
      logout()
    }
    return
  }

  const user = response.result
  appState.user = user

  // Render overview details
  document.getElementById('profile-display-name').textContent = user.name || 'Anonymous User'
  document.getElementById('profile-display-username').textContent = user.username || `user_${user._id.substring(18)}`
  document.getElementById('header-username').textContent = user.name || 'User'

  // Avatar / Cover
  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
  const defaultCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=300&fit=crop'
  document.getElementById('profile-avatar').src = user.avatar || defaultAvatar
  document.getElementById('header-avatar').src = user.avatar || defaultAvatar
  document.getElementById('profile-cover').src = user.cover_photo || defaultCover

  // Dashboard user info (Top Right)
  document.getElementById('dashboard-user-name').textContent = `Welcome, ${user.name || 'User'}`
  document.getElementById('dashboard-user-avatar').src = user.avatar || defaultAvatar

  // Render values
  document.getElementById('info-name').textContent = user.name || '-'
  document.getElementById('info-email').textContent = user.email || '-'
  document.getElementById('info-username').textContent = user.username ? `@${user.username}` : '-'

  // DOB parsing
  if (user.date_of_birth) {
    const dob = new Date(user.date_of_birth)
    document.getElementById('info-dob').textContent = dob.toLocaleDateString()
    document.getElementById('edit-dob').value = dob.toISOString().split('T')[0]
  } else {
    document.getElementById('info-dob').textContent = '-'
  }

  document.getElementById('info-bio').textContent = user.bio || 'No bio written yet.'
  document.getElementById('info-location').textContent = user.location || '-'
  document.getElementById('info-website').textContent = user.website || '-'

  // Render Edit Form fields
  document.getElementById('edit-name').value = user.name || ''
  document.getElementById('edit-username').value = user.username || ''
  document.getElementById('edit-location').value = user.location || ''
  document.getElementById('edit-website').value = user.website || ''
  document.getElementById('edit-bio').value = user.bio || ''

  // Verification badge
  const badge = document.getElementById('verification-status-badge')
  const resendBtn = document.getElementById('resend-verify-email-btn')

  if (user.verify === 1) {
    // Verified status
    badge.className = 'badge badge-verified'
    badge.textContent = 'Verified'
    resendBtn.classList.add('hidden')
  } else {
    badge.className = 'badge badge-unverified'
    badge.textContent = 'Unverified'
    resendBtn.classList.remove('hidden')

    // Fetch latest verify token to simulate email verification in sandbox
    pollInterceptionTokens()
  }
}

// Helper to poll local db tokens in development environment
async function pollInterceptionTokens() {
  try {
    const res = await fetch(`${API_BASE}/users/debug/latest-tokens`)
    if (res.ok) {
      const data = await res.json()
      if (data.email_verify_token && appState.user && data.email === appState.user.email) {
        const box = document.getElementById('email-verification-interception-box')
        const link = document.getElementById('intercepted-verify-link')
        link.href = `#/verify-email?token=${data.email_verify_token}`
        box.classList.remove('hidden')
      }
    }
  } catch (e) {
    console.warn('Interception tokens fetch failed:', e)
  }
}

// Email Verification Handler
async function handleEmailVerification(token) {
  if (!token) {
    showToast('Invalid verification token', 'error')
    window.location.hash = '#/'
    return
  }

  showToast('Verifying your email address...', 'info')
  const response = await apiCall(`/users/verify-email/?email_verify_token=${token}`, {
    method: 'GET'
  })

  if (response.error) {
    showToast(response.message, 'error')
  } else {
    showToast('Your email address has been verified successfully!', 'success')
  }

  window.location.hash = '#/'
}

// Logout handler
async function logout() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    // Notify server about logout
    try {
      await apiCall('/users/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken })
      })
    } catch (e) {
      console.error('Logout API error:', e)
    }
  }
  clearTokens()
  appState.user = null
  appState.cart = { items: [], total: 0 }
  updateCartBadge()
  closeCartDrawer()
  showToast('You have logged out.', 'info')
  hideMainHeader()
  setTimeout(() => {
    window.location.hash = '#/'
    handleRoute()
  }, 100)
}

// Upload file handler (Avatar & Cover)
async function handleImageUpload(file, uploadType) {
  const formData = new FormData()
  // Formidable expects field name: 'image'
  formData.append('image', file)

  showToast(`Uploading ${uploadType}...`, 'info')

  const response = await apiCall('/medias/upload-image', {
    method: 'POST',
    body: formData
  })

  if (response.error) {
    showToast(`Failed to upload ${uploadType}: ${response.message}`, 'error')
    return
  }

  const imageUrl = response.result // This is the public URL served by the server

  // Patch user profile
  const patchPayload = {}
  patchPayload[uploadType === 'avatar' ? 'avatar' : 'cover_photo'] = imageUrl

  const updateResponse = await apiCall('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(patchPayload)
  })

  if (updateResponse.error) {
    showToast(`Failed to save ${uploadType}: ${updateResponse.message}`, 'error')
  } else {
    showToast(`${uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} updated successfully!`, 'success')
    loadDashboardData()
  }
}

// --- FORM SUBMISSIONS ---

// Handle Login Submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('login-email').value
  const password = document.getElementById('login-password').value

  showToast('Logging in...', 'info')
  const response = await apiCall('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })

  if (response.error) {
    showToast(response.message, 'error')
  } else {
    setTokens(response.result.access_token, response.result.refresh_token)
    showToast('Welcome back to TechCart!', 'success')
    await fetchCart()
    window.location.hash = '#/'
  }
})

// Handle Register Submission
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('register-name').value
  const email = document.getElementById('register-email').value
  const dob = document.getElementById('register-dob').value
  const password = document.getElementById('register-password').value
  const confirm_password = document.getElementById('register-confirm-password').value

  if (password !== confirm_password) {
    showToast('Passwords do not match.', 'error')
    return
  }

  showToast('Creating account...', 'info')
  const response = await apiCall('/users/register', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email,
      date_of_birth: new Date(dob).toISOString(),
      password,
      confirm_password
    })
  })

  if (response.error) {
    // Show detailed validation messages if present
    if (response.errors) {
      Object.keys(response.errors).forEach((key) => {
        showToast(`${key}: ${response.errors[key]}`, 'error')
      })
    } else {
      showToast(response.message, 'error')
    }
  } else {
    showToast('Registration successful! Check your email to verify your account.', 'success')
    // Clear registration fields
    document.getElementById('register-form').reset()

    // Automatically retrieve the mock verification link for user convenience
    setTimeout(async () => {
      try {
        const devTokensRes = await fetch(`${API_BASE}/users/debug/latest-tokens`)
        if (devTokensRes.ok) {
          const devTokens = await devTokensRes.json()
          if (devTokens.email === email && devTokens.email_verify_token) {
            // Log in console & auto-simulate
            console.log('Dev intercept verification token:', devTokens.email_verify_token)
            showToast(
              'Dev intercept: Account created. You can verify email using console link or proceed to log in.',
              'info'
            )
          }
        }
      } catch (err) {}
    }, 500)

    window.location.hash = '#/login'
  }
})

// Handle Forgot Password Submission
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('forgot-email').value

  showToast('Generating reset token...', 'info')
  const response = await apiCall('/users/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  })

  if (response.error) {
    showToast(response.message, 'error')
  } else {
    showToast('A password recovery token has been generated. Please check your inbox.', 'success')

    // Poll for generated token to display in development box
    setTimeout(async () => {
      try {
        const devTokensRes = await fetch(`${API_BASE}/users/debug/latest-tokens`)
        if (devTokensRes.ok) {
          const devTokens = await devTokensRes.json()
          if (devTokens.email === email && devTokens.forgot_password_token) {
            const tokenBox = document.getElementById('reset-token-box')
            const link = document.getElementById('intercepted-reset-link')
            link.href = `#/reset-password?token=${devTokens.forgot_password_token}`
            tokenBox.classList.remove('hidden')
            showToast('Recovery link intercepted!', 'success')
          }
        }
      } catch (err) {}
    }, 600)
  }
})

// Handle Reset Password Submission
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const token = document.getElementById('reset-token-input').value
  const password = document.getElementById('reset-password').value
  const confirm_password = document.getElementById('reset-confirm-password').value

  if (!token) {
    showToast('Reset token is missing. Please initiate a new recovery request.', 'error')
    return
  }

  if (password !== confirm_password) {
    showToast('Passwords do not match.', 'error')
    return
  }

  showToast('Updating your password...', 'info')
  const response = await apiCall('/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      forgot_password_token: token,
      password,
      confirm_password
    })
  })

  if (response.error) {
    showToast(response.message, 'error')
  } else {
    showToast('Your password has been reset successfully. Please log in.', 'success')
    document.getElementById('reset-password-form').reset()
    document.getElementById('reset-token-box').classList.add('hidden')
    window.location.hash = '#/login'
  }
})

// Handle Edit Profile Form Submission
document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('edit-name').value
  const username = document.getElementById('edit-username').value
  const dob = document.getElementById('edit-dob').value
  const location = document.getElementById('edit-location').value
  const website = document.getElementById('edit-website').value
  const bio = document.getElementById('edit-bio').value

  const payload = {
    name,
    date_of_birth: dob ? new Date(dob).toISOString() : undefined,
    location,
    website,
    bio
  }

  // Only send username if it has changed, to avoid unique conflicts
  if (username && username !== appState.user.username) {
    payload.username = username
  }

  showToast('Saving changes...', 'info')
  const response = await apiCall('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  if (response.error) {
    showToast(response.message, 'error')
  } else {
    showToast('Profile updated successfully!', 'success')
    // Reload dashboard
    await loadDashboardData()
    // Switch to Overview tab
    document.querySelector('.nav-tab[data-tab="tab-overview"]').click()
  }
})

// Handle Change Password Form Submission
document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const old_password = document.getElementById('change-old-password').value
  const password = document.getElementById('change-new-password').value
  const confirm_password = document.getElementById('change-confirm-password').value

  if (password !== confirm_password) {
    showToast('New passwords do not match.', 'error')
    return
  }

  showToast('Updating password...', 'info')
  const response = await apiCall('/users/change-password', {
    method: 'PUT',
    body: JSON.stringify({
      old_password,
      password,
      confirm_password
    })
  })

  if (response.error) {
    showToast(response.message, 'error')
  } else {
    showToast('Password updated successfully!', 'success')
    document.getElementById('change-password-form').reset()
    // Switch to Overview tab
    document.querySelector('.nav-tab[data-tab="tab-overview"]').click()
  }
})

// --- INTERACTIVE EVENT BINDINGS ---

// Resend Verification Email Button
document.getElementById('resend-verify-email-btn').addEventListener('click', async () => {
  showToast('Sending verification email...', 'info')
  const response = await apiCall('/users/resend-verify-email', {
    method: 'POST'
  })

  if (response.error) {
    showToast(response.message, 'error')
  } else {
    showToast('Verification email sent! Intercepting link...', 'success')
    setTimeout(pollInterceptionTokens, 800)
  }
})

// Global Header Logout Button
document.getElementById('logout-btn').addEventListener('click', (e) => {
  e.preventDefault()
  showConfirmationDialog('Logout Confirmation', 'Are you sure you want to logout?', logout)
})

// Header user dashboard button
document.getElementById('header-dashboard-btn').addEventListener('click', (e) => {
  e.preventDefault()
  window.location.hash = '#/dashboard'
})

// Logo click handler - Return to home page
document.querySelector('.logo').addEventListener('click', (e) => {
  e.preventDefault()
  window.location.hash = '#/'
})

// Dashboard button click handler - handled by global delegation
function handleDashboardButtonClick(e) {
  e.stopPropagation()
  console.log('🎯 Dashboard button clicked')

  const currentRoute = window.location.hash || '#/'
  console.log('📍 Current route:', currentRoute)

  if (currentRoute === '#/dashboard') {
    // Already on dashboard, refresh data
    console.log('🔄 Already on dashboard, refreshing data')
    loadDashboardData()
  } else {
    // Navigate to dashboard
    console.log('🤖 Navigating to dashboard')
    window.location.hash = '#/dashboard'
  }
}

// Avatar file upload listener
document.getElementById('avatar-upload').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) {
    handleImageUpload(file, 'avatar')
  }
})

// Cover photo file upload listener
document.getElementById('cover-upload').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) {
    handleImageUpload(file, 'cover')
  }
})

// Sidebar Tab switching
document.querySelectorAll('.nav-tab').forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => {
    // Remove active from all tabs & tab-buttons
    document.querySelectorAll('.nav-tab').forEach((btn) => btn.classList.remove('active'))
    document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'))

    // Set active
    tabBtn.classList.add('active')
    const targetTabId = tabBtn.getAttribute('data-tab')
    document.getElementById(targetTabId).classList.add('active')

    appState.activeTab = targetTabId
    if (targetTabId === 'tab-orders') {
      loadOrders()
    }
    lucide.createIcons()
  })
})

// Cart drawer controls
document.getElementById('cart-toggle-btn').addEventListener('click', async () => {
  if (!isLoggedIn()) {
    showToast('Please log in to view your cart.', 'info')
    window.location.hash = '#/login'
    return
  }
  await fetchCart()
  openCartDrawer()
})

document.getElementById('cart-close-btn').addEventListener('click', closeCartDrawer)
document.getElementById('cart-overlay').addEventListener('click', closeCartDrawer)
document.getElementById('checkout-btn').addEventListener('click', handleCheckout)
document.getElementById('cart-shop-link').addEventListener('click', () => {
  closeCartDrawer()
  window.location.hash = '#/'
})

// --- QUICK WINS IMPLEMENTATIONS ---

// Go to Top Button
const goToTopBtn = document.getElementById('go-to-top-btn')
window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    goToTopBtn.classList.remove('hidden')
  } else {
    goToTopBtn.classList.add('hidden')
  }
})

goToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// Confirmation Dialog Helper
function showConfirmationDialog(title, message, onConfirm) {
  const dialog = document.getElementById('confirmation-dialog')
  document.getElementById('confirmation-title').textContent = title
  document.getElementById('confirmation-message').textContent = message

  dialog.classList.remove('hidden')

  const confirmBtn = document.getElementById('confirmation-confirm-btn')
  const cancelBtn = document.getElementById('confirmation-cancel-btn')

  // Remove old listeners
  confirmBtn.replaceWith(confirmBtn.cloneNode(true))
  cancelBtn.replaceWith(cancelBtn.cloneNode(true))

  // Add new listeners
  document.getElementById('confirmation-confirm-btn').addEventListener('click', () => {
    dialog.classList.add('hidden')
    onConfirm()
  })

  document.getElementById('confirmation-cancel-btn').addEventListener('click', () => {
    dialog.classList.add('hidden')
  })
}

// Add character limits to edit profile form
document.getElementById('edit-username').maxLength = 30
document.getElementById('edit-bio').maxLength = 500
document.getElementById('edit-location').maxLength = 100
document.getElementById('edit-website').maxLength = 200

// Loading state helper for buttons
function setButtonLoading(btn, loading) {
  if (loading) {
    btn.disabled = true
    btn.dataset.originalText = btn.innerHTML
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-icon"></i> Loading...'
    lucide.createIcons()
  } else {
    btn.disabled = false
    btn.innerHTML = btn.dataset.originalText
    lucide.createIcons()
  }
}

// --- INITIALIZATION ---
// Global event delegation for dashboard button
document.addEventListener(
  'click',
  (e) => {
    // Check if click target is the dashboard button or child of it
    const dashboardBtn = e.target.closest('#dashboard-user-info')
    if (dashboardBtn) {
      console.log('🎯 Dashboard button clicked via delegation')
      handleDashboardButtonClick(e)
    }
  },
  false
) // Use false for bubbling phase

window.addEventListener('hashchange', handleRoute)
window.addEventListener('load', () => {
  console.log('✅ App loaded, initializing...')
  handleRoute()
})
