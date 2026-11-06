import { appState } from './state.js'
import { apiCall } from './api.js'
import { formatCurrency, showToast } from './ui.js'
import { handleAddToCart } from './cart.js'

// --- STORE & ROTATING CIRCLE WHEEL + LEFT SHOWCASE ---

function normalizeAngle(angle) {
  let a = angle % (2 * Math.PI)
  if (a > Math.PI) a -= 2 * Math.PI
  if (a < -Math.PI) a += 2 * Math.PI
  return a
}

function getWheelFocalAngle() {
  return window.innerWidth <= 1120 ? -Math.PI / 2 : Math.PI
}

function getWheelRadius() {
  return window.innerWidth <= 640 ? 125 : 205
}

export async function loadProducts() {
  const grid = document.getElementById('products-grid')
  const loading = document.getElementById('products-loading')
  const empty = document.getElementById('products-empty')
  const splitLayout = document.getElementById('store-split-layout')
  if (!grid || !loading || !empty) return

  loading.classList.remove('hidden')
  empty.classList.add('hidden')
  if (splitLayout) splitLayout.classList.add('hidden')
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

  if (splitLayout) splitLayout.classList.remove('hidden')
  if (appState.selectedProductIndex >= appState.products.length) {
    appState.selectedProductIndex = 0
  }

  renderProducts()
}

export function renderProducts() {
  const grid = document.getElementById('products-grid')
  const products = appState.products
  const count = products.length
  if (!grid || count === 0) return

  grid.innerHTML = products
    .map((product, index) => {
      const id = product._id
      return `
      <article class="wheel-item ${index === appState.selectedProductIndex ? 'active' : ''}" data-index="${index}" data-product-id="${id}" role="button" tabindex="0" aria-label="Select ${product.name}">
        <div class="wheel-item-thumb-wrap">
          <img src="${product.image_url}" alt="${product.name}" class="wheel-item-thumb" loading="lazy">
        </div>
        <h3 class="wheel-item-name">${product.name}</h3>
        <span class="wheel-item-price">${formatCurrency(product.price)}</span>
      </article>
    `
    })
    .join('')

  const focalAngle = getWheelFocalAngle()
  const stepAngle = (2 * Math.PI) / count
  appState.wheelRotation = focalAngle - appState.selectedProductIndex * stepAngle
  appState.wheelTargetRotation = appState.wheelRotation

  updateWheelPositions()
  updateShowcasePanel(appState.selectedProductIndex, false)
  initWheelInteractions()

  if (window.lucide) window.lucide.createIcons()
}

export function updateWheelPositions() {
  const grid = document.getElementById('products-grid')
  if (!grid) return
  const items = grid.querySelectorAll('.wheel-item')
  const count = items.length
  if (count === 0) return

  const radius = getWheelRadius()
  const focalAngle = getWheelFocalAngle()
  const stepAngle = (2 * Math.PI) / count

  items.forEach((item, index) => {
    const theta = appState.wheelRotation + index * stepAngle
    const x = Math.cos(theta) * radius
    const y = Math.sin(theta) * radius

    const diff = Math.abs(normalizeAngle(theta - focalAngle))
    const closeness = (Math.cos(diff) + 1) / 2
    const scale = 0.86 + closeness * 0.24
    const zIndex = Math.round(closeness * 8) + 1

    item.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) scale(${scale.toFixed(3)})`
    item.style.zIndex = zIndex
    item.classList.toggle('active', index === appState.selectedProductIndex)
  })
}

function animateWheelToTarget() {
  if (appState.wheelAnimFrame) {
    cancelAnimationFrame(appState.wheelAnimFrame)
    appState.wheelAnimFrame = null
  }

  function step() {
    const diff = appState.wheelTargetRotation - appState.wheelRotation
    if (Math.abs(diff) < 0.002) {
      appState.wheelRotation = appState.wheelTargetRotation
      updateWheelPositions()
      appState.wheelAnimFrame = null
      return
    }
    appState.wheelRotation += diff * 0.16
    updateWheelPositions()
    appState.wheelAnimFrame = requestAnimationFrame(step)
  }

  appState.wheelAnimFrame = requestAnimationFrame(step)
}

export function selectWheelProduct(index, animate = true) {
  const count = appState.products.length
  if (count === 0) return

  const normalizedIndex = ((index % count) + count) % count
  const changed = normalizedIndex !== appState.selectedProductIndex
  appState.selectedProductIndex = normalizedIndex

  const focalAngle = getWheelFocalAngle()
  const stepAngle = (2 * Math.PI) / count
  const desiredRotation = focalAngle - normalizedIndex * stepAngle
  const shortestDelta = normalizeAngle(desiredRotation - appState.wheelRotation)
  appState.wheelTargetRotation = appState.wheelRotation + shortestDelta

  if (animate) {
    animateWheelToTarget()
  } else {
    appState.wheelRotation = appState.wheelTargetRotation
    updateWheelPositions()
  }

  updateShowcasePanel(normalizedIndex, changed)
}

export function updateShowcasePanel(index, animateTransition = true) {
  const product = appState.products[index]
  if (!product) return

  const total = appState.products.length
  const pad = (n) => String(n).padStart(2, '0')

  const categoryEl = document.getElementById('showcase-category')
  const brandEl = document.getElementById('showcase-brand')
  const counterEl = document.getElementById('showcase-counter')
  const imageEl = document.getElementById('showcase-image')
  const discountBadgeEl = document.getElementById('showcase-discount-badge')
  const ratingValEl = document.getElementById('showcase-rating-val')
  const soldEl = document.getElementById('showcase-sold')
  const stockEl = document.getElementById('showcase-stock')
  const titleEl = document.getElementById('showcase-title')
  const descEl = document.getElementById('showcase-description')
  const priceEl = document.getElementById('showcase-price')
  const origPriceEl = document.getElementById('showcase-original-price')
  const qtyValEl = document.getElementById('showcase-qty-value')
  const addBtn = document.getElementById('showcase-add-to-cart-btn')
  const hubTitleEl = document.getElementById('wheel-hub-active-name')

  if (animateTransition) {
    appState.showcaseQty = 1
  }
  if (qtyValEl) qtyValEl.textContent = appState.showcaseQty

  if (categoryEl) categoryEl.textContent = product.category || 'Tech'
  if (brandEl) brandEl.textContent = product.brand || 'Official'
  if (counterEl) counterEl.textContent = `${pad(index + 1)} / ${pad(total)}`
  if (hubTitleEl) hubTitleEl.textContent = product.name

  const discount =
    product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0

  if (discountBadgeEl) {
    if (discount > 0) {
      discountBadgeEl.textContent = `-${discount}% OFF`
      discountBadgeEl.classList.remove('hidden')
    } else {
      discountBadgeEl.classList.add('hidden')
    }
  }

  if (imageEl) {
    if (animateTransition) {
      imageEl.classList.add('switching')
      setTimeout(() => {
        imageEl.src = product.image_url
        imageEl.alt = product.name
        imageEl.classList.remove('switching')
      }, 130)
    } else {
      imageEl.src = product.image_url
      imageEl.alt = product.name
    }
  }

  if (ratingValEl) ratingValEl.textContent = product.rating || 4.8
  if (soldEl) soldEl.textContent = `${product.sold_count || 0} sold`
  if (stockEl) {
    stockEl.textContent = product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'
    stockEl.classList.toggle('low', product.stock <= 5)
  }

  if (titleEl) titleEl.textContent = product.name
  if (descEl) descEl.textContent = product.description
  if (priceEl) priceEl.textContent = formatCurrency(product.price)

  if (origPriceEl) {
    if (discount > 0) {
      origPriceEl.textContent = formatCurrency(product.original_price)
      origPriceEl.classList.remove('hidden')
    } else {
      origPriceEl.classList.add('hidden')
    }
  }

  if (addBtn) {
    addBtn.disabled = product.stock === 0
    addBtn.dataset.productId = product._id
  }
}

function findNearestWheelIndex() {
  const count = appState.products.length
  if (count === 0) return 0
  const focalAngle = getWheelFocalAngle()
  const stepAngle = (2 * Math.PI) / count

  let bestIndex = 0
  let bestDist = Infinity
  for (let i = 0; i < count; i++) {
    const theta = appState.wheelRotation + i * stepAngle
    const dist = Math.abs(normalizeAngle(theta - focalAngle))
    if (dist < bestDist) {
      bestDist = dist
      bestIndex = i
    }
  }
  return bestIndex
}

export function initWheelInteractions() {
  const grid = document.getElementById('products-grid')
  const stage = document.getElementById('wheel-stage')
  if (!grid || !stage) return

  grid.querySelectorAll('.wheel-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (stage.dataset.wasDragged === 'true') return
      e.stopPropagation()
      const idx = parseInt(item.dataset.index, 10)
      if (!isNaN(idx)) {
        selectWheelProduct(idx, true)
      }
    })
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const idx = parseInt(item.dataset.index, 10)
        if (!isNaN(idx)) {
          selectWheelProduct(idx, true)
        }
      }
    })
  })

  if (appState.wheelInitialized) return
  appState.wheelInitialized = true

  let isDragging = false
  let lastPointerAngle = 0
  let startX = 0
  let startY = 0

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.wheel-hub-btn')) return
    isDragging = true
    stage.dataset.wasDragged = 'false'
    startX = e.clientX
    startY = e.clientY

    if (appState.wheelAnimFrame) {
      cancelAnimationFrame(appState.wheelAnimFrame)
      appState.wheelAnimFrame = null
    }

    const rect = stage.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    lastPointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
  })

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return
    const moveDist = Math.hypot(e.clientX - startX, e.clientY - startY)
    if (moveDist > 6) {
      stage.dataset.wasDragged = 'true'
    }

    const rect = stage.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
    const deltaAngle = normalizeAngle(currentAngle - lastPointerAngle)
    lastPointerAngle = currentAngle

    appState.wheelRotation += deltaAngle
    appState.wheelTargetRotation = appState.wheelRotation

    const nearest = findNearestWheelIndex()
    if (nearest !== appState.selectedProductIndex) {
      appState.selectedProductIndex = nearest
      updateShowcasePanel(nearest, true)
    }
    updateWheelPositions()
  })

  window.addEventListener('pointerup', () => {
    if (!isDragging) return
    isDragging = false
    if (stage.dataset.wasDragged === 'true') {
      const nearest = findNearestWheelIndex()
      selectWheelProduct(nearest, true)
      setTimeout(() => {
        stage.dataset.wasDragged = 'false'
      }, 60)
    }
  })

  let wheelCooldown = false
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      if (wheelCooldown || appState.products.length === 0) return
      wheelCooldown = true
      const dir = e.deltaY > 0 ? 1 : -1
      selectWheelProduct(appState.selectedProductIndex + dir, true)
      setTimeout(() => {
        wheelCooldown = false
      }, 180)
    },
    { passive: false }
  )

  document.getElementById('wheel-rotate-ccw')?.addEventListener('click', () => {
    selectWheelProduct(appState.selectedProductIndex - 1, true)
  })
  document.getElementById('wheel-rotate-cw')?.addEventListener('click', () => {
    selectWheelProduct(appState.selectedProductIndex + 1, true)
  })
  document.getElementById('showcase-prev-btn')?.addEventListener('click', () => {
    selectWheelProduct(appState.selectedProductIndex - 1, true)
  })
  document.getElementById('showcase-next-btn')?.addEventListener('click', () => {
    selectWheelProduct(appState.selectedProductIndex + 1, true)
  })

  document.getElementById('showcase-qty-minus')?.addEventListener('click', () => {
    if (appState.showcaseQty > 1) {
      appState.showcaseQty--
      document.getElementById('showcase-qty-value').textContent = appState.showcaseQty
    }
  })
  document.getElementById('showcase-qty-plus')?.addEventListener('click', () => {
    const currentProduct = appState.products[appState.selectedProductIndex]
    const maxStock = currentProduct ? currentProduct.stock : 99
    if (appState.showcaseQty < maxStock) {
      appState.showcaseQty++
      document.getElementById('showcase-qty-value').textContent = appState.showcaseQty
    }
  })
  document.getElementById('showcase-add-to-cart-btn')?.addEventListener('click', () => {
    const currentProduct = appState.products[appState.selectedProductIndex]
    if (currentProduct) {
      handleAddToCart(currentProduct._id, appState.showcaseQty)
    }
  })

  window.addEventListener('keydown', (e) => {
    const storeScreen = document.getElementById('store-screen')
    if (!storeScreen || storeScreen.classList.contains('hidden')) return
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      selectWheelProduct(appState.selectedProductIndex + 1, true)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      selectWheelProduct(appState.selectedProductIndex - 1, true)
    }
  })

  window.addEventListener('resize', () => {
    if (appState.products.length > 0) {
      selectWheelProduct(appState.selectedProductIndex, false)
    }
  })
}

