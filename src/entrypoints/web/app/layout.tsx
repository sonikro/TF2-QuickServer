import { Metadata } from 'next'
import Link from 'next/link'
import '../globals.css'  // Import global styles

export const metadata: Metadata = {
  title: 'TF2 QuickServer Manager',
  description: 'Manage and deploy TF2 servers quickly and easily',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto py-6 px-4">
              <h1 className="text-3xl font-bold text-gray-900">
                TF2 QuickServer Manager
              </h1>
              <nav className="mt-4">
                <Link href="/" className="text-gray-600 hover:text-gray-900 mr-4">
                  Home
                </Link>
              </nav>
            </div>
          </header>
          <main className="max-w-7xl mx-auto py-6 px-4">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
