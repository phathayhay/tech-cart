const GUEST_SESSION_STORAGE_KEY = 'techcart_guest_session_id'

export function getOrCreateGuestSessionId(): string {
  let sessionId = localStorage.getItem(GUEST_SESSION_STORAGE_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(GUEST_SESSION_STORAGE_KEY, sessionId)
  }
  return sessionId
}

export function formatVND(amount: number | string): string {
  const num = typeof amount === 'string' ? Number(amount) : amount
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number.isFinite(num) ? num : 0)
}

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
  meta?: {
    page: number
    limit: number
    total_items: number
    total_pages: number
  }
  request_id: string
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const token = localStorage.getItem('techcart_access_token')
  const guestSessionId = getOrCreateGuestSessionId()

  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  headers.set('X-Guest-Session-Id', guestSessionId)

  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers
  })

  const json = await response.json()
  if (!response.ok || json.success === false) {
    const errorMessage = json?.error?.message || json?.message || 'Yêu cầu thất bại'
    throw new Error(errorMessage)
  }
  return json as ApiEnvelope<T>
}

