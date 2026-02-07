/**
 * Sidebar Default Fallback
 * 
 * This component is rendered when the sidebar parallel route
 * cannot match a more specific page.tsx file.
 */
'use client';

import { Sidebar } from '@/components/Sidebar';

export default function SidebarDefault() {
  return <Sidebar />;
}
