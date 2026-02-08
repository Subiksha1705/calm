import { RequireAuth } from '@/components/RequireAuth';

export default function SettingsPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-white/60">Settings UI coming soon.</p>
        </div>
      </div>
    </RequireAuth>
  );
}
