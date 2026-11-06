import { API_BASE, appState, isLoggedIn } from './state.js'
import { apiCall } from './api.js'
import { formatCurrency, formatPaymentMethod, formatPaymentStatus, showToast } from './ui.js'
import { logout } from './auth.js'

// --- DASHBOARD, PROFILE, CLOUDINARY UPLOAD & ORDERS MODULE ---

export async function loadHeaderUser() {
  if (!isLoggedIn()) return
  const response = await apiCall('/users/me', { method: 'POST' })
  if (response.error) return
  const user = response.result
  appState.user = user
  const usernameEl = document.getElementById('header-username')
  if (usernameEl) usernameEl.textContent = user.name || 'User'
  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
  const avatarEl = document.getElementById('header-avatar')
  if (avatarEl) avatarEl.src = user.avatar || defaultAvatar
}

export async function loadOrders() {
  const loading = document.getElementById('orders-loading')
  const empty = document.getElementById('orders-empty')
  const tableWrapper = document.getElementById('orders-table-wrapper')
  const tbody = document.getElementById('orders-table-body')
  if (!loading || !empty || !tableWrapper || !tbody) return

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

export async function loadDashboardData() {
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

  document.getElementById('profile-display-name').textContent = user.name || 'Anonymous User'
  document.getElementById('profile-display-username').textContent = user.username || `user_${user._id.substring(18)}`
  document.getElementById('header-username').textContent = user.name || 'User'

  const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
  const defaultCover = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=300&fit=crop'
  document.getElementById('profile-avatar').src = user.avatar || defaultAvatar
  document.getElementById('header-avatar').src = user.avatar || defaultAvatar
  document.getElementById('profile-cover').src = user.cover_photo || defaultCover

  document.getElementById('dashboard-user-name').textContent = `Welcome, ${user.name || 'User'}`
  document.getElementById('dashboard-user-avatar').src = user.avatar || defaultAvatar

  document.getElementById('info-name').textContent = user.name || '-'
  document.getElementById('info-email').textContent = user.email || '-'
  document.getElementById('info-username').textContent = user.username ? `@${user.username}` : '-'

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

  document.getElementById('edit-name').value = user.name || ''
  document.getElementById('edit-username').value = user.username || ''
  document.getElementById('edit-location').value = user.location || ''
  document.getElementById('edit-website').value = user.website || ''
  document.getElementById('edit-bio').value = user.bio || ''

  const badge = document.getElementById('verification-status-badge')
  const resendBtn = document.getElementById('resend-verify-email-btn')

  if (user.verify === 1) {
    badge.className = 'badge badge-verified'
    badge.textContent = 'Verified'
    resendBtn.classList.add('hidden')
  } else {
    badge.className = 'badge badge-unverified'
    badge.textContent = 'Unverified'
    resendBtn.classList.remove('hidden')
    pollInterceptionTokens()
  }
}

export async function pollInterceptionTokens() {
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

export async function handleEmailVerification(token) {
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

export async function handleImageUpload(file, uploadType) {
  const formData = new FormData()
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

  const imageUrl = response.result
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

export function initDashboardEvents() {
  const editUsername = document.getElementById('edit-username')
  const editBio = document.getElementById('edit-bio')
  const editLocation = document.getElementById('edit-location')
  const editWebsite = document.getElementById('edit-website')
  if (editUsername) editUsername.maxLength = 30
  if (editBio) editBio.maxLength = 500
  if (editLocation) editLocation.maxLength = 100
  if (editWebsite) editWebsite.maxLength = 200

  document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
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

    if (username && username !== appState.user?.username) {
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
      await loadDashboardData()
      document.querySelector('.nav-tab[data-tab="tab-overview"]')?.click()
    }
  })

  document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
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
      document.querySelector('.nav-tab[data-tab="tab-overview"]')?.click()
    }
  })

  document.getElementById('resend-verify-email-btn')?.addEventListener('click', async () => {
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

  document.getElementById('header-dashboard-btn')?.addEventListener('click', (e) => {
    e.preventDefault()
    window.location.hash = '#/dashboard'
  })

  document.getElementById('avatar-upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) handleImageUpload(file, 'avatar')
  })

  document.getElementById('cover-upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file) handleImageUpload(file, 'cover')
  })

  document.querySelectorAll('.nav-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((btn) => btn.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'))

      tabBtn.classList.add('active')
      const targetTabId = tabBtn.getAttribute('data-tab')
      document.getElementById(targetTabId)?.classList.add('active')

      appState.activeTab = targetTabId
      if (targetTabId === 'tab-orders') {
        loadOrders()
      }
      if (window.lucide) window.lucide.createIcons()
    })
  })

  document.addEventListener('click', (e) => {
    const dashboardBtn = e.target.closest('#dashboard-user-info')
    if (dashboardBtn) {
      e.stopPropagation()
      const currentRoute = window.location.hash || '#/'
      if (currentRoute === '#/dashboard') {
        loadDashboardData()
      } else {
        window.location.hash = '#/dashboard'
      }
    }
  })
}

