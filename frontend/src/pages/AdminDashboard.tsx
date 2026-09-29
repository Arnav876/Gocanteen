import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased font-sans pb-20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl" data-icon="admin_panel_settings">
                admin_panel_settings
              </span>
            </div>
            <div>
              <span className="text-headline-md font-bold text-primary tracking-tight">CampusBites</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-semibold">
                Platform Administrator
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-surface-container text-label-sm font-semibold text-on-surface transition"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Welcome Banner */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 custom-warm-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-bold">
              <span className="material-symbols-outlined text-base">shield_person</span>
              <span>Administrator Privileges</span>
            </div>
            <h1 className="text-headline-lg font-bold text-on-surface">
              {user?.fullName || 'System Administrator'}
            </h1>
            <p className="text-body-md text-on-surface-variant max-w-xl">
              Campus Canteen Operations & User Management Control Center.
            </p>
          </div>
        </section>

        {/* Status Card */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Admin Access Verified</h2>
              <p className="text-body-sm text-on-surface-variant">Role: {user?.role} (Highest system authorization)</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
            <p className="text-body-sm text-on-surface font-medium">Administrator Email: {user?.email}</p>
            <p className="text-body-sm text-on-surface font-medium">Account ID: {user?.id}</p>
            <p className="text-body-sm text-on-surface font-medium">System Status: PostgreSQL Database Connected</p>
          </div>
        </section>
      </main>
    </div>
  );
};
