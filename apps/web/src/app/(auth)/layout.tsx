import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Dental<span className="text-blue-600">IQ</span>
          </span>
        </div>
        <p className="text-sm text-slate-500">AI-powered insurance intelligence for dental practices</p>
      </div>
      {children}
    </div>
  )
}
