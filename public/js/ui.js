import { isLoggedIn } from './state.js'

// --- FORMAT HELPERS ---
export function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function formatPaymentMethod(method) {
  const labels = {
    cod: 'COD',
    card: 'Mock Card',
    bank_transfer: 'Bank Transfer'
  }
  return labels[method] || 'COD'
}

export function formatPaymentStatus(status) {
  const labels = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded'
  }
  return labels[status] || 'Pending'
}

// --- TOAST NOTIFICATIONS ---
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container')
  if (!container) return
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
  if (window.lucide) window.lucide.createIcons()

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    setTimeout(() => {
      toast.remove()
    }, 300)
  }, 4000)
}

// --- HEADER & SCREEN VISIBILITY ---
export function showMainHeader() {
  const header = document.getElementById('main-header')
  if (!header) return
  header.classList.remove('hidden')
  const loggedIn = isLoggedIn()
  document.getElementById('header-logged-in')?.classList.toggle('hidden', !loggedIn)
  document.getElementById('header-guest')?.classList.toggle('hidden', loggedIn)
}

export function hideMainHeader() {
  document.getElementById('main-header')?.classList.add('hidden')
}

export function showScreen(screenId) {
  document.getElementById(screenId)?.classList.remove('hidden')
}

// --- CONFIRMATION DIALOG ---
export function showConfirmationDialog(title, message, onConfirm) {
  const dialog = document.getElementById('confirmation-dialog')
  if (!dialog) return
  document.getElementById('confirmation-title').textContent = title
  document.getElementById('confirmation-message').textContent = message

  dialog.classList.remove('hidden')

  const confirmBtn = document.getElementById('confirmation-confirm-btn')
  const cancelBtn = document.getElementById('confirmation-cancel-btn')

  confirmBtn.replaceWith(confirmBtn.cloneNode(true))
  cancelBtn.replaceWith(cancelBtn.cloneNode(true))

  document.getElementById('confirmation-confirm-btn').addEventListener('click', () => {
    dialog.classList.add('hidden')
    onConfirm()
  })

  document.getElementById('confirmation-cancel-btn').addEventListener('click', () => {
    dialog.classList.add('hidden')
  })
}

export function setButtonLoading(btn, loading) {
  if (loading) {
    btn.disabled = true
    btn.dataset.originalText = btn.innerHTML
    btn.innerHTML = '<i data-lucide="loader-2" class="spin-icon"></i> Loading...'
    if (window.lucide) window.lucide.createIcons()
  } else {
    btn.disabled = false
    btn.innerHTML = btn.dataset.originalText
    if (window.lucide) window.lucide.createIcons()
  }
}

export function initUiHelpers() {
  const goToTopBtn = document.getElementById('go-to-top-btn')
  if (goToTopBtn) {
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
  }

  document.querySelector('.logo')?.addEventListener('click', (e) => {
    e.preventDefault()
    window.location.hash = '#/'
  })
}

