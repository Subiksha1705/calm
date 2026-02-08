import { Suspense } from "react";
import { ChatProvider } from "@/contexts/ChatContext";
import { RequireAuth } from "@/components/RequireAuth";

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

function ChatFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading...</div>
    </div>
  );
}

export default function ChatLayout({
  children,
  sidebar,
  chat,
}: {
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
  chat?: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="antialiased bg-[#202123] text-white">
        <ChatProvider>
          <div className="flex h-screen overflow-hidden">
            <Suspense fallback={<SidebarFallback />}>{sidebar}</Suspense>
            <Suspense fallback={<ChatFallback />}>
              <main className="flex-1 flex flex-col overflow-hidden">
                {chat || children || <ChatFallback />}
              </main>
            </Suspense>
          </div>
        </ChatProvider>
      </div>
    </RequireAuth>
  );
}
