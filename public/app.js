import { initUiHelpers } from './js/ui.js'
import { initAuthEvents } from './js/auth.js'
import { initCartEvents } from './js/cart.js'
import { initDashboardEvents } from './js/dashboard.js'
import { handleRoute } from './js/router.js'

// --- APPLICATION ENTRY POINT ---

async function loadHtmlViews() {
  const mainContainer = document.getElementById('app-main')
  if (!mainContainer) return

  const viewFiles = ['./views/auth.html', './views/store.html', './views/dashboard.html']
  const htmlParts = await Promise.all(
    viewFiles.map(async (path) => {
      const res = await fetch(path)
      return res.ok ? res.text() : ''
    })
  )

  mainContainer.innerHTML = htmlParts.join('\n')
}

async function bootstrapApp() {
  console.log('✅ Bootstrapping modular TechCart frontend...')
  await loadHtmlViews()

  initUiHelpers()
  initAuthEvents()
  initCartEvents()
  initDashboardEvents()

  window.addEventListener('hashchange', handleRoute)
  await handleRoute()
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrapApp)
} else {
  bootstrapApp()
}
