import React, { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api-client'
import { useAuthStore, UserAddressItem } from '../../stores/useAuthStore'

export const AccountModal: React.FC = () => {
  const { user, isAccountModalOpen, setAccountModalOpen, fetchProfile, clearSession } =
    useAuthStore()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [addresses, setAddresses] = useState<UserAddressItem[]>([])
  const [newStreet, setNewStreet] = useState('')
  const [newDistrict, setNewDistrict] = useState('')
  const [newCity, setNewCity] = useState('TP. Hồ Chí Minh')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isAccountModalOpen && user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setBio(user.bio || '')
      setAddresses(user.addresses || [])
    }
  }, [isAccountModalOpen, user])

  if (!isAccountModalOpen || !user) return null

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    await apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ full_name: fullName, phone, bio })
    })
    await fetchProfile()
    setMessage('Đã lưu thông tin hồ sơ!')
    setTimeout(() => setMessage(null), 2500)
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStreet.trim() || !newDistrict.trim()) return
    await apiRequest('/users/me/addresses', {
      method: 'POST',
      body: JSON.stringify({
        label: 'Địa chỉ giao hàng',
        recipient_name: fullName || user.full_name,
        phone: phone || user.phone || '0909000000',
        street_line1: newStreet,
        district: newDistrict,
        city: newCity,
        is_default: true
      })
    })
    setNewStreet('')
    setNewDistrict('')
    await fetchProfile()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user.full_name}</h3>
            <p className="text-xs text-slate-500">
              {user.email} • Vai trò: {user.roles.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSession}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"
            >
              Đăng xuất
            </button>
            <button
              onClick={() => setAccountModalOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
            {message}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Thông tin cá nhân</h4>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Họ và tên</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Số điện thoại</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Giới thiệu</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              Cập nhật hồ sơ
            </button>
          </form>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900">
              Sổ địa chỉ nhận hàng ({addresses.length})
            </h4>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>
                      {addr.recipientName} ({addr.phone})
                    </span>
                    {addr.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mt-1">
                    {addr.streetLine1}, {addr.district}, {addr.city}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddAddress} className="space-y-2 pt-2 border-t border-slate-200">
              <input
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
                placeholder="Số nhà, tên đường..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  placeholder="Quận / Huyện"
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
                <input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Tỉnh / Thành phố"
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                + Thêm địa chỉ mặc định mới
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
