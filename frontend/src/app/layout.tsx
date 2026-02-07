import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { ChatProvider } from "@/contexts/ChatContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calm Sphere - Mental Health Chatbot",
  description: "A supportive mental health chatbot with thread-based conversations",
};


/**
 * Sidebar Loading Fallback
 * Shows while sidebar content is loading
 */
function SidebarFallback() {
  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-screen bg-gray-50 dark:bg-[#202123] border-r border-gray-200 dark:border-gray-700">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full h-12 bg-gray-200 dark:bg-[#2A2B32] rounded-lg animate-pulse" />
      </div>
      <div className="flex-1 p-3 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-[#2A2B32] rounded-lg animate-pulse" />
        ))}
      </div>
    </aside>
  );
}


/**
 * Chat Loading Fallback
 * Shows while chat content is loading
 */
function ChatFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>
  );
}


/**
 * Root Layout with Parallel Routes
 * 
 * This layout implements parallel routing with @sidebar and @chat routes.
 * The sidebar persists across thread switches while the chat area updates.
 * 
 * Structure:
 * - @sidebar: Sidebar component (persistent)
 * - @chat: Chat area component (changes with thread)
 * - children: Default slot (not used with parallel routes)
 */
export default function RootLayout({
  children,
  sidebar,
  chat,
}: {
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
  chat?: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-[#343541]`}
      >
        {/* TASK 1: Local memory only - Wrap with ChatProvider for shared state */}
        <ChatProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar Parallel Route */}
            <Suspense fallback={<SidebarFallback />}>
              {sidebar}
            </Suspense>

            {/* Chat Parallel Route */}
            <Suspense fallback={<ChatFallback />}>
              <main className="flex-1 flex flex-col overflow-hidden">
                {chat || children || <ChatFallback />}
              </main>
            </Suspense>
          </div>
        </ChatProvider>
      </body>
    </html>
  );
}
