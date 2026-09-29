import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const CustomerDashboard: React.FC = () => {
  const { user, selectedLocation, logout } = useAuth();
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
              <span className="material-symbols-outlined text-2xl" data-icon="restaurant">
                restaurant
              </span>
            </div>
            <div>
              <span className="text-headline-md font-bold text-primary tracking-tight">CampusBites</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-label-sm font-semibold">
                Student Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 bg-surface-container px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-primary text-base" data-icon="location_on">
                location_on
              </span>
              <span className="text-label-sm font-semibold text-on-surface">
                {selectedLocation?.name || 'Main Campus Dining'}
              </span>
            </div>

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
              <span className="material-symbols-outlined text-base">verified_user</span>
              <span>Authenticated as Customer</span>
            </div>
            <h1 className="text-headline-lg font-bold text-on-surface">
              Welcome back, {user?.fullName || 'Student'}!
            </h1>
            <p className="text-body-md text-on-surface-variant max-w-xl">
              Your session is authenticated. You are connected to{' '}
              <strong className="text-primary">{selectedLocation?.name || 'Campus Canteens'}</strong>.
            </p>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div>
              <span className="text-label-sm font-medium text-on-surface-variant block">Campus Meal Card</span>
              <span className="text-headline-sm font-bold text-on-surface">₹ 250.00</span>
            </div>
          </div>
        </section>

        {/* Phase 3 Flow Verified Card */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">check_circle</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Phase 3 Authentication Connected</h2>
              <p className="text-body-sm text-on-surface-variant">Real JWT authentication & Role-based Routing verified.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-label-sm font-bold text-primary uppercase tracking-wide">Account Details</span>
              <p className="text-body-sm text-on-surface font-medium">Email: {user?.email}</p>
              <p className="text-body-sm text-on-surface font-medium">Role: {user?.role}</p>
              <p className="text-body-sm text-on-surface font-medium">Phone: {user?.phoneNumber || 'Not configured'}</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-label-sm font-bold text-primary uppercase tracking-wide">Selected Location</span>
              <p className="text-body-sm text-on-surface font-medium">Name: {selectedLocation?.name || 'Main Canteen'}</p>
              <p className="text-body-sm text-on-surface font-medium">Hall: {selectedLocation?.hallName || 'Central Hub'}</p>
              <p className="text-body-sm text-on-surface font-medium">Crowd: {selectedLocation?.crowdStatus || 'Normal crowd'}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
