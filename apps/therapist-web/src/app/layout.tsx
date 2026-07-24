import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'
import { Providers } from '@/components/providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'MyTherapyPath — Therapist Portal',
  description: 'Occupational Therapy exercise tracking and instruction platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 antialiased">
        <Providers>
          <Sidebar />
          <main className="ml-64 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
