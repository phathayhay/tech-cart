import React, { useEffect, useState } from 'react'
import { apiRequest, formatVND } from './lib/api-client'

interface HealthData {
  status: string
  service: string
  currency_default: string
  payment_providers: string[]
  checks: {
    database: { status: string; latency_ms: number }
    cloudinary: { configured: boolean; cloud_name: string | null }
  }
}

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null)

  useEffect(() => {
    apiRequest<HealthData>('/health')
      .then((res) => setHealth(res.data))
      .catch(() => undefined)
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="TechCart Logo"
              className="h-10 w-auto object-contain rounded-xl drop-shadow-sm"
            />
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900">TechCart Pro</h1>
              <p className="text-xs text-slate-500">AI-Powered 360° Showcase • {formatVND(2990000)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              Tiền tệ: {health?.currency_default || 'VND (₫)'}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              DB: {health?.checks?.database?.status || 'READY'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-8">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-4">
            Phase 1 Foundation Ready
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Nền tảng Kiến trúc NestJS + React 19 + PostgreSQL + Cloudinary
          </h2>
          <p className="text-slate-600 max-w-2xl">
            Hệ thống nền tảng Phase 1 đã sẵn sàng với đơn vị tiền tệ mặc định VND (₫) và cổng thanh toán VNPay Sandbox + COD.
          </p>
        </div>
      </main>
    </div>
  )
}
export default App

