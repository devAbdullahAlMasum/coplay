import type { Metadata } from 'next'
import { RoomProvider } from '@/contexts/room-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'CoPlay - Watch Together',
  description: 'Watch videos together in perfect sync with friends',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <RoomProvider>
          {children}
        </RoomProvider>
      </body>
    </html>
  )
}
