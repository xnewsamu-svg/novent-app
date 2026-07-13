"use client"

import "./globals.css"

import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
