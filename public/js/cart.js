import { appState, isLoggedIn } from './state.js'
import { apiCall } from './api.js'
import { formatCurrency, showToast } from './ui.js'
import { loadOrders } from './dashboard.js'

// --- CART & CHECKOUT MODULE ---

export function getCartItemCount() {
  if (!appState.cart || !appState.cart.items) return 0
  return appState.cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

export function updateCartBadge() {
  const badge = document.getElementById('cart-badge')
  if (!badge) return
  const count = getCartItemCount()
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count
    badge.classList.remove('hidden')
  } else {
    badge.classList.add('hidden')
  }
}

export async function handleAddToCart(productId, quantity = 1) {
  if (!isLoggedIn()) {
    showToast('Please log in to add items to your cart.', 'info')
    window.location.hash = '#/login'
    return
  }

  showToast('Adding to cart...', 'info')
  const response = await apiCall('/cart/add', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity })
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

export async function fetchCart() {
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

export function renderCartDrawer() {
  const container = document.getElementById('cart-items-container')
  const emptyState = document.getElementById('cart-empty-state')
  const totalEl = document.getElementById('cart-total-amount')
  const checkoutBtn = document.getElementById('checkout-btn')
  if (!container || !emptyState || !totalEl || !checkoutBtn) return

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

  if (window.lucide) window.lucide.createIcons()
}

export async function updateCartQuantity(productId, delta) {
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

export async function removeCartItem(productId) {
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

export async function handleCheckout() {
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

export function openCartDrawer() {
  appState.cartDrawerOpen = true
  document.getElementById('cart-drawer')?.classList.add('open')
  const overlay = document.getElementById('cart-overlay')
  if (overlay) {
    overlay.classList.remove('hidden')
    requestAnimationFrame(() => overlay.classList.add('visible'))
  }
}

export function closeCartDrawer() {
  appState.cartDrawerOpen = false
  document.getElementById('cart-drawer')?.classList.remove('open')
  const overlay = document.getElementById('cart-overlay')
  if (overlay) {
    overlay.classList.remove('visible')
    setTimeout(() => overlay.classList.add('hidden'), 300)
  }
}

export function initCartEvents() {
  document.getElementById('cart-toggle-btn')?.addEventListener('click', async () => {
    if (!isLoggedIn()) {
      showToast('Please log in to view your cart.', 'info')
      window.location.hash = '#/login'
      return
    }
    await fetchCart()
    openCartDrawer()
  })

  document.getElementById('cart-close-btn')?.addEventListener('click', closeCartDrawer)
  document.getElementById('cart-overlay')?.addEventListener('click', closeCartDrawer)
  document.getElementById('checkout-btn')?.addEventListener('click', handleCheckout)
  document.getElementById('cart-shop-link')?.addEventListener('click', () => {
    closeCartDrawer()
    window.location.hash = '#/'
  })
}

