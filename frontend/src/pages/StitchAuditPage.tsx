import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export const StitchAuditPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'stitch-audit'>('overview');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    // Health check ping to Express server
    const checkHealth = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const res = await fetch(`${apiUrl}/api/health`);
        if (res.ok) {
          setServerStatus('online');
          return;
        }
      } catch {
        try {
          const fallbackRes = await fetch('http://localhost:5000/api/health');
          if (fallbackRes.ok) {
            setServerStatus('online');
            return;
          }
        } catch {
          // offline
        }
      }
      setServerStatus('offline');
    };
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased font-sans pb-20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl" data-icon="restaurant">
                restaurant
              </span>
            </div>
            <div>
              <span className="text-headline-md font-bold text-primary tracking-tight">CampusBites</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-label-sm font-semibold">
                Dev & Stitch Audit
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-on-primary text-label-sm font-bold shadow-sm hover:bg-primary-container transition"
            >
              <span className="material-symbols-outlined text-base">login</span>
              <span>Go to Live App Login</span>
            </Link>

            <div className="flex items-center space-x-2 bg-surface-container-lowest border border-outline-variant/40 rounded-full px-3 py-1 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    serverStatus === 'online' ? 'bg-tertiary-container' : 'bg-secondary'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    serverStatus === 'online' ? 'bg-tertiary' : 'bg-secondary'
                  }`}
                ></span>
              </span>
              <span className="text-label-sm font-medium text-on-surface">
                {serverStatus === 'online' ? 'API & Sockets Live' : 'Backend Ready'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Hero Section */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 custom-warm-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-bold">
              <span className="material-symbols-outlined text-sm" data-icon="check_circle" data-weight="fill">
                check_circle
              </span>
              Preserved Google Stitch Design System Reference
            </div>
            <h1 className="text-headline-lg font-bold text-on-surface tracking-tight">
              Smart College Canteen Ordering System
            </h1>
            <p className="text-body-md text-on-surface-variant max-w-2xl">
              Vite + React 19 + TypeScript frontend with exact <strong>Warm Fast-Casual Gourmet</strong> design tokens, Plus
              Jakarta Sans typography, and Material Symbols.
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-outline-variant/30 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-label-md font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            Preserved Stitch Screens
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-4 py-2 rounded-xl text-label-md font-bold transition-all ${
              activeTab === 'tokens'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            Design Token Showcase
          </button>
          <button
            onClick={() => setActiveTab('stitch-audit')}
            className={`px-4 py-2 rounded-xl text-label-md font-bold transition-all ${
              activeTab === 'stitch-audit'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            Architecture & Database
          </button>
        </div>

        {/* Tab Content: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 card-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl" data-icon="how_to_reg">
                    how_to_reg
                  </span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">Role Sign-in & Location</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Customer / Provider dual login, campus GPS auto-detection, Hall PIN search, and counter selection.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                <span className="text-label-sm font-bold text-tertiary bg-on-tertiary-container px-2 py-0.5 rounded">
                  Live in Phase 3
                </span>
                <span className="text-body-sm text-outline">Screen 1</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 card-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl" data-icon="restaurant_menu">
                    restaurant_menu
                  </span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">Customer Menu Ordering</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Lunch Rush Live banner, dietary filters (Halal, Vegan, GF), categories, food bento cards, and persistent cart tray.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                <span className="text-label-sm font-bold text-primary bg-primary-fixed/40 px-2 py-0.5 rounded">
                  Customer Catalog
                </span>
                <span className="text-body-sm text-outline">Screen 2</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 card-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl" data-icon="payments">
                    payments
                  </span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">Instant Checkout</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Pickup preference (ASAP vs Class Break), Student 15% discount, Campus Smart Meal Card 1-Tap, and slide-to-pay.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                <span className="text-label-sm font-bold text-secondary bg-secondary-fixed px-2 py-0.5 rounded">
                  Payment Flow
                </span>
                <span className="text-body-sm text-outline">Screen 3</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 card-shadow flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl" data-icon="soup_kitchen">
                    soup_kitchen
                  </span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">Provider Kitchen KDS</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Live Queue, Pace & Revenue stats, state tabs (New, Prepping, Ready), order tickets, 86-list stock toggles, and audio chime.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between">
                <span className="text-label-sm font-bold text-tertiary bg-on-tertiary-container px-2 py-0.5 rounded">
                  KDS Terminal
                </span>
                <span className="text-body-sm text-outline">Screen 4</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Tokens */}
        {activeTab === 'tokens' && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-6">
            <h2 className="text-headline-sm font-bold text-on-surface">Design Tokens: Warm Fast-Casual Gourmet</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-primary text-on-primary">
                <span className="text-label-sm block opacity-80">Primary</span>
                <span className="font-bold text-label-md">#A33900</span>
              </div>
              <div className="p-3 rounded-xl bg-primary-container text-on-primary-container">
                <span className="text-label-sm block opacity-80">Primary Cont.</span>
                <span className="font-bold text-label-md">#CC4900</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container">
                <span className="text-label-sm block opacity-80">Secondary Cont.</span>
                <span className="font-bold text-label-md">#FEA619</span>
              </div>
              <div className="p-3 rounded-xl bg-tertiary text-on-tertiary">
                <span className="text-label-sm block opacity-80">Tertiary</span>
                <span className="font-bold text-label-md">#006947</span>
              </div>
              <div className="p-3 rounded-xl bg-inverse-surface text-inverse-on-surface">
                <span className="text-label-sm block opacity-80">Inverse Surface</span>
                <span className="font-bold text-label-md">#283044</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface">
                <span className="text-label-sm block text-on-surface-variant">Surface Cont.</span>
                <span className="font-bold text-label-md">#EAEDFF</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Stitch Audit */}
        {activeTab === 'stitch-audit' && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-4">
            <h2 className="text-headline-sm font-bold text-on-surface">Full-Stack Architecture</h2>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <p className="text-body-md text-on-surface">
                All 5 original Google Stitch screens remain preserved in the repository under{' '}
                <code>stitch_smart_canteen_ordering_system/</code>.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
