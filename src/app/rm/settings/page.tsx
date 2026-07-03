'use client';

import { useAuthStore } from '@/lib/store/auth.store';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { tokenStore } from '@/lib/api/client';

export default function RmSettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="page-padding">
      <RmPageHeader title="Profile Settings" description="Session, 2FA, and device management" />
      <div className="glass-card max-w-lg space-y-4 rounded-xl p-6">
        <div>
          <p className="text-sm text-muted-foreground">Name</p>
          <p className="font-semibold">{user?.full_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-semibold">{user?.phone}</p>
        </div>
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              logout();
              tokenStore.clear();
              window.location.href = '/auth/login';
            }}
          >
            Log out all devices
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/auth/2fa')}>
            Configure 2FA
          </Button>
        </div>
      </div>
    </div>
  );
}
