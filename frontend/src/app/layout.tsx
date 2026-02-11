import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Calm Sphere - Mental Health Chatbot",
  description: "A supportive mental health chatbot with thread-based conversations",
  icons: {
    icon: "/Gemini_Generated_Image_en79ysen79ysen79.png",
    shortcut: "/Gemini_Generated_Image_en79ysen79ysen79.png",
    apple: "/Gemini_Generated_Image_en79ysen79ysen79.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning >
      <body
        className="antialiased bg-gray-50 text-gray-900 dark:bg-[#202123] dark:text-gray-100"
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
