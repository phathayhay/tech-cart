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
      </div>
    </div>
  )
}
