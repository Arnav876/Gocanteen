import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const ProviderDashboard: React.FC = () => {
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
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl" data-icon="storefront">
                storefront
              </span>
            </div>
            <div>
              <span className="text-headline-md font-bold text-primary tracking-tight">CampusBites</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-semibold">
                Kitchen Partner Portal
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-bold">
              <span className="material-symbols-outlined text-base">storefront</span>
              <span>Provider Merchant Terminal</span>
            </div>
            <h1 className="text-headline-lg font-bold text-on-surface">
              {user?.provider?.name || user?.fullName || 'Canteen Partner'}
            </h1>
            <p className="text-body-md text-on-surface-variant max-w-xl">
              Terminal Status: <strong className="text-tertiary">ONLINE & ACCEPTING ORDERS</strong>
            </p>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
              <span className="material-symbols-outlined text-2xl">countertops</span>
            </div>
            <div>
              <span className="text-label-sm font-medium text-on-surface-variant block">Stall Counter</span>
              <span className="text-headline-sm font-bold text-on-surface">
                {user?.provider?.counterNumber || 'Counter 01'}
              </span>
            </div>
          </div>
        </section>

        {/* Details Card */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Provider Credentials & Terminal Link</h2>
              <p className="text-body-sm text-on-surface-variant">Authenticated via backend JWT.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-label-sm font-bold text-primary uppercase tracking-wide">Manager Account</span>
              <p className="text-body-sm text-on-surface font-medium">Name: {user?.fullName}</p>
              <p className="text-body-sm text-on-surface font-medium">Email: {user?.email}</p>
              <p className="text-body-sm text-on-surface font-medium">Role: {user?.role}</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-label-sm font-bold text-primary uppercase tracking-wide">Stall Details</span>
              <p className="text-body-sm text-on-surface font-medium">Stall Name: {user?.provider?.name || 'Assigned Counter'}</p>
              <p className="text-body-sm text-on-surface font-medium">Approval Status: {user?.provider?.status || 'APPROVED'}</p>
              <p className="text-body-sm text-on-surface font-medium">Counter: {user?.provider?.counterNumber || 'Kiosk 01'}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
