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

  const handleGoogleSignIn = async () => {
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

      // Local/Dev 1-click simulation
      const simRes = await apiRequest<{
        access_token: string
        refresh_token: string
        user: AuthUserProfile
        is_new_user: boolean
        account_linked: boolean
      }>('/auth/google/dev-simulate', {
        method: 'POST',
        body: JSON.stringify({
          email: email || 'customer@techcart.com',
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
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* LEFT PANEL: Platform Value Proposition */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-white via-orange-50/60 to-red-50/80 p-8 flex-col justify-between border-r border-slate-200/80">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <img
                src="/images/logo.png"
                alt="TechCart Logo"
                className="h-9 w-auto object-contain drop-shadow-xs"
              />
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                Tech<span className="text-orange-600">Cart</span> Pro
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200/60 text-orange-700 text-xs font-semibold mb-4">
              ✨ Nền tảng E-Commerce AI 2026
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900 leading-tight mb-3">
              Mua sắm công nghệ <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">thông minh & an tâm</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Trải nghiệm mua sắm thiết bị số đỉnh cao với sự hỗ trợ toàn diện từ Trợ lý AI và mô hình 360° tương tác.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/70 border border-white/80 shadow-xs">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
                  AI
                </span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Trợ lý Mua sắm Gemini AI</h5>
                  <p className="text-[11px] text-slate-500 leading-tight">So sánh cấu hình, tư vấn chọn phụ kiện chuẩn xác 24/7.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/70 border border-white/80 shadow-xs">
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-sm font-bold shrink-0">
                  360°
                </span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Vòng xoay sản phẩm 360°</h5>
                  <p className="text-[11px] text-slate-500 leading-tight">Xoay ngắm chi tiết sản phẩm chân thực trước khi mua.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/70 border border-white/80 shadow-xs">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
                  VN
                </span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Thanh toán an toàn VNPay & COD</h5>
                  <p className="text-[11px] text-slate-500 leading-tight">Bảo vệ giao dịch, mã hóa mật khẩu chuẩn Bcrypt.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-orange-200/50 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>⭐️ 4.9/5 Đánh giá tin cậy</span>
            <span>10,000+ Khách hàng</span>
          </div>
        </div>

        {/* RIGHT PANEL: Clean & Minimal Login Form */}
        <div className="col-span-1 md:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {tab === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {tab === 'login'
                  ? 'Chào mừng quay trở lại! Vui lòng điền thông tin bên dưới'
                  : 'Nhận ngay voucher WELCOME10 giảm 10% sau khi tạo tài khoản'}
              </p>
            </div>
            <button
              onClick={() => setAuthModalOpen(false)}
              className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1.5 rounded-lg hover:bg-slate-100 transition"
              title="Đóng modal"
            >
              ✕
            </button>
          </div>

          {/* Quick Google 1-Click Action */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-xs"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <span>{tab === 'login' ? 'Tiếp tục với Google' : 'Đăng ký nhanh với Google'}</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
                Hoặc bằng email
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setTab('login')
                setError(null)
              }}
              className={`py-2 rounded-lg transition ${
                tab === 'login' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register')
                setError(null)
              }}
              className={`py-2 rounded-lg transition ${
                tab === 'register' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              Đăng ký mới
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm transition"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm transition"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Mật khẩu</label>
                {tab === 'login' && (
                  <a href="#/forgot-password" className="text-xs text-orange-600 hover:underline font-medium">
                    Quên mật khẩu?
                  </a>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold text-sm transition shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập ngay' : 'Hoàn tất đăng ký'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
