'use client';

import { Sidebar } from '@/components/Sidebar';


/**
 * Sidebar Parallel Route Page
 * 
 * This page component renders the sidebar which persists across thread switches.
 * It uses the @sidebar parallel route outlet in layout.tsx.
 * 
 * Key behavior:
 * - Sidebar does NOT re-render when switching threads
 * - Thread selection is handled via ChatContext (no navigation needed)
 */
export default function SidebarPage() {
  // Thread state is managed by ChatContext
  // No need for URL-based thread selection
  
  return <Sidebar />;
}
