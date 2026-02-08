'use client';

import { Sidebar } from '@/components/Sidebar';

/**
 * Sidebar Parallel Route Page
 *
 * This page component renders the sidebar which persists across thread switches.
 * It uses the @sidebar parallel route outlet in (chat)/layout.tsx.
 */
export default function SidebarPage() {
  return <Sidebar />;
}

