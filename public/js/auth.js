import { API_BASE, appState, getRefreshToken, setTokens, clearTokens } from './state.js'
import { apiCall } from './api.js'
import { showToast, showConfirmationDialog, hideMainHeader } from './ui.js'
import { fetchCart, updateCartBadge, closeCartDrawer } from './cart.js'
import { handleRoute } from './router.js'

// --- AUTHENTICATION MODULE (LOGIN, REGISTER, FORGOT/RESET PASSWORD, LOGOUT) ---

export async function logout() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
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

export function initAuthEvents() {
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
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

  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
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
      if (response.errors) {
        Object.keys(response.errors).forEach((key) => {
          showToast(`${key}: ${response.errors[key]}`, 'error')
        })
      } else {
        showToast(response.message, 'error')
      }
    } else {
      showToast('Registration successful! Check your email to verify your account.', 'success')
      document.getElementById('register-form').reset()

      setTimeout(async () => {
        try {
          const devTokensRes = await fetch(`${API_BASE}/users/debug/latest-tokens`)
          if (devTokensRes.ok) {
            const devTokens = await devTokensRes.json()
            if (devTokens.email === email && devTokens.email_verify_token) {
              console.log('Dev intercept verification token:', devTokens.email_verify_token)
              showToast(
                'Dev intercept: Account created. You can verify email using console link or proceed to log in.',
                'info'
              )
            }
          }
        } catch (_err) {}
      }, 500)

      window.location.hash = '#/login'
    }
  })

  document.getElementById('forgot-password-form')?.addEventListener('submit', async (e) => {
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
        } catch (_err) {}
      }, 600)
    }
  })

  document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
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
      document.getElementById('reset-token-box')?.classList.add('hidden')
      window.location.hash = '#/login'
    }
  })

  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault()
    showConfirmationDialog('Logout Confirmation', 'Are you sure you want to logout?', logout)
  })

  const handleGoogleSignIn = async () => {
    try {
      showToast('Connecting to Google Sign-In...', 'info')
      const urlRes = await fetch(`${API_BASE}/api/v1/auth/google/url`)
      const urlJson = await urlRes.json()

      // If real Google OAuth Client ID is configured in .env, redirect to Google consent screen
      if (urlJson?.data?.configured && urlJson?.data?.auth_url) {
        window.location.href = urlJson.data.auth_url
        return
      }

      // If in dev/local mode without GOOGLE_CLIENT_ID, perform instantaneous 1-click dev sign-in
      const emailInput =
        document.getElementById('login-email')?.value?.trim() ||
        document.getElementById('register-email')?.value?.trim() ||
        'customer@techcart.com'
      const nameInput =
        document.getElementById('register-name')?.value?.trim() || 'Google TechCart Customer'

      const simRes = await fetch(`${API_BASE}/api/v1/auth/google/dev-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          full_name: nameInput
        })
      })
      const simJson = await simRes.json()
      if (!simRes.ok || !simJson?.success) {
        showToast(simJson?.error?.message || simJson?.message || 'Google Sign-In failed', 'error')
        return
      }

      setTokens(simJson.data.access_token, simJson.data.refresh_token)
      appState.user = {
        id: simJson.data.user.id,
        email: simJson.data.user.email,
        name: simJson.data.user.full_name,
        avatar: simJson.data.user.avatar_url
      }
      showToast(`Signed in with Google (${simJson.data.user.email})!`, 'success')
      await fetchCart()
      window.location.hash = '#/'
      handleRoute()
    } catch (err) {
      showToast('Google Sign-In error: ' + (err.message || 'Unknown error'), 'error')
    }
  }

  document.getElementById('google-login-btn')?.addEventListener('click', handleGoogleSignIn)
  document.getElementById('google-register-btn')?.addEventListener('click', handleGoogleSignIn)
}

