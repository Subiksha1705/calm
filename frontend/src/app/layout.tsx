import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Calm Sphere - Mental Health Chatbot",
  description: "A supportive mental health chatbot with thread-based conversations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning >
      <body
        className="antialiased bg-black text-white"
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
