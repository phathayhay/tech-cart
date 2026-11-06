import React, { useState } from 'react'
import { apiRequest } from '../../lib/api-client'
import { AuthUserProfile, useAuthStore } from '../../stores/useAuthStore'

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setAuthModalOpen, setSession, fetchProfile } = useAuthStore()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('customer@techcart.com')
  const [password, setPassword] = useState('Password123!')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'login') {
        const res = await apiRequest<{
          access_token: string
          refresh_token: string
          user: AuthUserProfile
        }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        })
        setSession(res.data.access_token, res.data.refresh_token, res.data.user)
        await fetchProfile()
      } else {
        const res = await apiRequest<{
          access_token: string
          refresh_token: string
          user: AuthUserProfile
        }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, full_name: fullName, phone })
        })
        setSession(res.data.access_token, res.data.refresh_token, res.data.user)
        await fetchProfile()
      }
    } catch (err: any) {
      setError(err.message || 'Thao tác thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            {tab === 'login' ? 'Đăng nhập TechCart Pro' : 'Tạo tài khoản mới'}
          </h3>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 text-sm font-semibold px-2 py-1"
          >
            Đóng
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`py-2 rounded-lg transition ${
              tab === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`py-2 rounded-lg transition ${
              tab === 'register' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                  placeholder="0909123456"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập ngay' : 'Hoàn tất đăng ký'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold">Hoặc tiếp tục với</span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setError(null)
            setLoading(true)
            try {
              const urlRes = await apiRequest<{
                auth_url: string
                configured: boolean
              }>('/auth/google/url')

              if (urlRes.data.configured) {
                window.location.href = urlRes.data.auth_url
                return
              }

              // Local/Dev simulation when GOOGLE_CLIENT_ID is not yet set in .env
              const simRes = await apiRequest<{
                access_token: string
                refresh_token: string
                user: AuthUserProfile
                is_new_user: boolean
                account_linked: boolean
              }>('/auth/google/dev-simulate', {
                method: 'POST',
                body: JSON.stringify({
                  email: email || 'google.user@gmail.com',
                  full_name: fullName || 'Google TechCart User'
                })
              })
              setSession(simRes.data.access_token, simRes.data.refresh_token, simRes.data.user)
              await fetchProfile()
            } catch (err: any) {
              setError(err.message || 'Đăng nhập Google thất bại')
            } finally {
              setLoading(false)
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition flex items-center justify-center gap-2.5 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
            />
            <path
              fill="#34A853"
              d="M3.6 7.4l3.2 2.4C7.7 7.6 9.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.6 7.4z"
            />
            <path
              fill="#FBBC05"
              d="M12 21.5c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2l-3.2 2.5c1.5 3.1 4.9 5.4 8.8 5.4z"
            />
            <path
              fill="#4285F4"
              d="M21.1 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.1 2.5-2.1 3.2l2.9 2.4c1.7-1.6 2.8-4 2.8-7.9z"
            />
          </svg>
          <span>Tiếp tục với Google</span>
        </button>
      </div>
    </div>
  )
}

