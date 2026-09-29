import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, parseApiError } from '../lib/api';
import type { Location } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, role, selectedLocation, setSelectedLocation } = useAuth();

  // Mode & Form state
  const [activeTab, setActiveTab] = useState<'student' | 'partner'>('student');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('student@campusbites.edu');
  const [password, setPassword] = useState<string>('StudentPassword123!');
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Locations state
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(true);
  const [detectedGpsActive, setDetectedGpsActive] = useState<boolean>(false);

  // Feedback & submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect according to role
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === 'CUSTOMER') navigate('/customer', { replace: true });
      else if (role === 'PROVIDER') navigate('/provider', { replace: true });
      else if (role === 'ADMIN') navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // Load locations from backend API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await api.locations.getAll();
        setLocations(data);
        if (data.length > 0 && !selectedLocation) {
          setSelectedLocation(data[0]);
        }
      } catch (err) {
        console.warn('Could not fetch locations from backend, using fallback list:', err);
        const fallbackLocations: Location[] = [
          {
            id: 'loc-main',
            name: 'Main Canteen',
            code: 'MAIN_CANTEEN',
            hallName: 'Student Central Hub Ground Floor',
            crowdStatus: 'Moderate crowd',
            avgPrepTimeMin: 10,
            isActive: true,
          },
          {
            id: 'loc-eng',
            name: 'Engineering Block Canteen',
            code: 'ENG_BLOCK',
            hallName: 'Counter 2 (East Concourse)',
            crowdStatus: 'Normal crowd',
            avgPrepTimeMin: 7,
            isActive: true,
          },
          {
            id: 'loc-foodcourt',
            name: 'North Campus Food Court',
            code: 'FOOD_COURT',
            hallName: 'Science Annex • Level 1',
            crowdStatus: 'High crowd',
            avgPrepTimeMin: 15,
            isActive: true,
          },
        ];
        setLocations(fallbackLocations);
        if (!selectedLocation) {
          setSelectedLocation(fallbackLocations[0]);
        }
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [selectedLocation, setSelectedLocation]);

  // Switch role tab
  const handleTabSwitch = (tab: 'student' | 'partner') => {
    setActiveTab(tab);
    setErrorMessage(null);
    if (tab === 'partner') {
      setIsRegisterMode(false);
      setEmail('freshbites@campusbites.edu');
      setPassword('ProviderPassword123!');
    } else {
      setEmail('student@campusbites.edu');
      setPassword('StudentPassword123!');
    }
  };

  // Quick fill developer test accounts
  const handleQuickFill = (type: 'student' | 'provider' | 'admin') => {
    setErrorMessage(null);
    setIsRegisterMode(false);
    if (type === 'student') {
      setActiveTab('student');
      setEmail('student@campusbites.edu');
      setPassword('StudentPassword123!');
    } else if (type === 'provider') {
      setActiveTab('partner');
      setEmail('freshbites@campusbites.edu');
      setPassword('ProviderPassword123!');
    } else if (type === 'admin') {
      setActiveTab('student');
      setEmail('admin@campusbites.edu');
      setPassword('AdminPassword123!');
    }
  };

  // GPS auto-detect simulation matching Stitch code.html
  const handleDetectLocation = () => {
    const matched = locations.find((l) => l.name.toLowerCase().includes('engineering')) || locations[0];
    if (matched) {
      setSelectedLocation(matched);
      setLocationSearch(`${matched.name} (Auto-detected)`);
      setDetectedGpsActive(true);
      setTimeout(() => setDetectedGpsActive(false), 1500);
    }
  };

  // Submit Handler (Login or Register)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.trim()) {
      setErrorMessage('Please enter your email or student ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        if (!fullName || fullName.trim().length < 2) {
          setErrorMessage('Please enter your full name (minimum 2 characters).');
          setIsSubmitting(false);
          return;
        }

        const user = await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
          preferredLocationId: selectedLocation ? selectedLocation.id : undefined,
        });

        if (user.role === 'CUSTOMER') navigate('/customer');
        else if (user.role === 'PROVIDER') navigate('/provider');
        else if (user.role === 'ADMIN') navigate('/admin');
      } else {
        const user = await login(email.trim(), password);
        if (user.role === 'CUSTOMER') navigate('/customer');
        else if (user.role === 'PROVIDER') navigate('/provider');
        else if (user.role === 'ADMIN') navigate('/admin');
      }
    } catch (err) {
      const formatted = parseApiError(err);
      setErrorMessage(formatted);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered locations based on search
  const filteredLocations = locations.filter((loc) => {
    if (!locationSearch) return true;
    const query = locationSearch.toLowerCase();
    return (
      loc.name.toLowerCase().includes(query) ||
      (loc.hallName && loc.hallName.toLowerCase().includes(query)) ||
      (loc.code && loc.code.toLowerCase().includes(query))
    );
  });

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased selection:bg-primary-fixed selection:text-on-primary-fixed pb-12">
      {/* Top App Bar (Exact from Stitch JSON) */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 py-3 max-w-md mx-auto bg-surface shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl" data-icon="restaurant">
            restaurant
          </span>
          <span className="text-headline-md font-headline-md font-bold text-primary tracking-tight">
            CampusBites
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-label-md font-label-md max-w-[180px] truncate">
          <span className="material-symbols-outlined text-base" data-icon="location_on">
            location_on
          </span>
          <span className="truncate">{selectedLocation ? selectedLocation.name : 'Main Campus'}</span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Role Switch Toggle */}
        <div className="bg-surface-container rounded-xl p-1 flex items-center shadow-inner relative">
          <button
            id="tab-student"
            type="button"
            onClick={() => handleTabSwitch('student')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 font-label-lg text-label-lg transition-all duration-200 ${
              activeTab === 'student'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg" data-icon="school">
              school
            </span>
            <span>Student / Staff (Customer)</span>
          </button>
          <button
            id="tab-partner"
            type="button"
            onClick={() => handleTabSwitch('partner')}
            className={`flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 font-label-lg text-label-lg transition-all duration-200 ${
              activeTab === 'partner'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg" data-icon="storefront">
              storefront
            </span>
            <span>Canteen Partner (Provider)</span>
          </button>
        </div>

        {/* Dynamic Hero Message */}
        <div className="space-y-1">
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            {activeTab === 'partner'
              ? 'Kitchen Display & Stall Terminal'
              : isRegisterMode
              ? 'Create your campus account.'
              : 'Quick campus pickup, zero queue.'}
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            {activeTab === 'partner'
              ? 'Log in with vendor credentials to manage active queue tickets.'
              : isRegisterMode
              ? 'Sign up with your university email to access all canteens.'
              : 'Authenticate your student account and select your pickup counter.'}
          </p>
        </div>

        {/* Auth Card Form */}
        <section className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
            <h2 className="text-headline-sm font-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl" data-icon="lock">
                lock
              </span>
              <span>
                {activeTab === 'partner'
                  ? 'Provider Merchant Access'
                  : isRegisterMode
                  ? 'Student Registration'
                  : 'Campus Credentials'}
              </span>
            </h2>
            <span className="text-label-sm font-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">
              FastAuth Enabled
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-error-container/70 border border-error/30 rounded-xl p-3 flex items-start gap-2.5 text-on-error-container">
              <span className="material-symbols-outlined text-error text-lg shrink-0 mt-0.5" data-icon="error">
                error
              </span>
              <p className="text-body-sm text-error font-medium">{errorMessage}</p>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            {/* If Register Mode, prompt for Full Name and Phone */}
            {isRegisterMode && activeTab === 'student' && (
              <>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant mb-1.5" htmlFor="name-input">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-lg" data-icon="person">
                        person
                      </span>
                    </span>
                    <input
                      id="name-input"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md text-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant mb-1.5" htmlFor="phone-input">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                      <span className="material-symbols-outlined text-lg" data-icon="call">
                        call
                      </span>
                    </span>
                    <input
                      id="phone-input"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md text-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-label-md font-label-md text-on-surface-variant mb-1.5" htmlFor="identity-input">
                {activeTab === 'partner' ? 'Partner ID or Stall Manager Email' : 'Student / Staff ID or Campus Email'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-lg" data-icon="badge">
                    badge
                  </span>
                </span>
                <input
                  id="identity-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'partner' ? 'e.g. freshbites@campusbites.edu' : 'e.g. student@campusbites.edu'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md text-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-label-md font-label-md text-on-surface-variant" htmlFor="password-input">
                  Security PIN / Password
                </label>
                {!isRegisterMode && (
                  <button
                    type="button"
                    onClick={() => setErrorMessage('Please contact campus IT desk or canteen administrator to reset credentials.')}
                    className="text-label-sm font-label-sm text-primary hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-lg" data-icon="key">
                    key
                  </span>
                </span>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md text-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-lg" data-icon={showPassword ? 'visibility_off' : 'visibility'}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Mode switch for Customer: Sign In vs Register */}
            {activeTab === 'student' && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setErrorMessage(null);
                  }}
                  className="text-label-sm font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">
                    {isRegisterMode ? 'login' : 'person_add'}
                  </span>
                  <span>{isRegisterMode ? 'Already have an account? Sign in' : 'New student? Create an account'}</span>
                </button>
              </div>
            )}

            {/* Quick 1-Tap Single Sign-On Pill */}
            {!isRegisterMode && (
              <button
                type="button"
                onClick={() => handleQuickFill(activeTab === 'partner' ? 'provider' : 'student')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-primary text-base" data-icon="school">
                  school
                </span>
                <span>Log in with University Single Sign-On (SSO)</span>
              </button>
            )}

            {/* Submit Action CTA */}
            <div className="pt-2">
              <button
                id="submit-cta"
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] py-3.5 px-6 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:scale-[0.98] transition-transform duration-150 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-on-primary border-t-transparent"></span>
                    <span>{isRegisterMode ? 'Creating account...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {activeTab === 'partner'
                        ? 'Open Kitchen Terminal'
                        : isRegisterMode
                        ? 'Create Account & Enter'
                        : 'Enter Canteen'}
                    </span>
                    <span className="material-symbols-outlined text-xl" data-icon="arrow_forward">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Location & Pickup Hall Selector Bento Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-sm font-headline-sm text-on-surface">Select Campus Location</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">Where are you picking up your meal?</p>
            </div>
            {/* GPS Auto-Detect Button */}
            <button
              type="button"
              onClick={handleDetectLocation}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed hover:bg-primary-fixed-dim transition text-label-sm font-label-sm font-bold shadow-sm active:scale-95 ${
                detectedGpsActive ? 'ring-2 ring-primary bg-primary-fixed-dim' : ''
              }`}
            >
              <span className="material-symbols-outlined text-sm" data-icon="my_location">
                my_location
              </span>
              <span>Use current building</span>
            </button>
          </div>

          {/* Quick-Access PIN or Building Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-lg" data-icon="search">
                search
              </span>
            </span>
            <input
              id="location-search"
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search building, block, or enter 4-digit Hall PIN"
              className={`w-full pl-10 pr-24 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition shadow-sm ${
                detectedGpsActive ? 'bg-secondary-fixed/20' : ''
              }`}
            />
            <div className="absolute inset-y-1 right-1 flex items-center">
              <span className="px-2 py-1 rounded bg-surface-container text-label-sm font-label-sm text-outline">
                PIN / Code
              </span>
            </div>
          </div>

          {/* Location Options Grid */}
          <div className="grid grid-cols-1 gap-2.5" id="location-cards">
            {isLoadingLocations ? (
              <div className="p-4 text-center text-body-sm text-outline">Loading campus dining halls...</div>
            ) : filteredLocations.length === 0 ? (
              <div className="p-4 text-center text-body-sm text-outline">No campus locations matching your search.</div>
            ) : (
              filteredLocations.map((loc, idx) => {
                const isSelected = selectedLocation?.id === loc.id;
                const iconName = idx === 0 ? 'lunch_dining' : idx === 1 ? 'local_cafe' : idx === 2 ? 'store' : 'restaurant';
                const hasFastLane = idx === 0 || loc.name.toLowerCase().includes('engineering');

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`location-card p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'ring-2 ring-primary bg-surface-container-lowest'
                        : 'border border-outline-variant/40 bg-surface-container-lowest hover:border-outline'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface'
                        }`}
                      >
                        <span className="material-symbols-outlined" data-icon={iconName}>
                          {iconName}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface text-label-lg font-label-lg">{loc.name}</span>
                          {hasFastLane && (
                            <span className="px-1.5 py-0.2 rounded text-label-sm font-label-sm bg-tertiary-container text-on-tertiary-container font-bold">
                              Fast Lane
                            </span>
                          )}
                        </div>
                        <p className="text-body-sm font-body-sm text-on-surface-variant">
                          {loc.hallName || 'Campus Main Concourse'} • {loc.avgPrepTimeMin || 10} min prep
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-label-sm font-label-sm text-tertiary">
                          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                          <span>Open • {loc.crowdStatus || 'Normal crowd'}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`check-icon flex items-center text-primary ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
                      <span
                        className="material-symbols-outlined text-2xl"
                        data-icon="check_circle"
                        data-weight="fill"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recently Ordered Locations Chips */}
          <div className="pt-2">
            <span className="text-label-sm font-label-sm text-on-surface-variant block mb-2 font-bold tracking-wider">
              RECENTLY VISITED CANTEENS
            </span>
            <div className="flex flex-wrap gap-2">
              {['Engineering Block', 'Main Canteen', 'Food Court', 'Hostel Block A'].map((chipName) => (
                <button
                  key={chipName}
                  type="button"
                  onClick={() => {
                    const match = locations.find((l) => l.name.toLowerCase().includes(chipName.toLowerCase()));
                    if (match) setSelectedLocation(match);
                    setLocationSearch(chipName);
                  }}
                  className="px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/60 hover:border-primary text-on-surface text-label-sm font-label-sm flex items-center gap-1.5 transition"
                >
                  <span className="material-symbols-outlined text-xs text-primary" data-icon="history">
                    history
                  </span>
                  <span>{chipName}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Provider Mode Contextual Alert / Hint */}
        {activeTab === 'partner' && (
          <div className="bg-secondary-fixed/40 border border-secondary-container rounded-xl p-3.5 flex items-start gap-3 transition-all">
            <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5" data-icon="info">
              info
            </span>
            <div className="space-y-0.5">
              <p className="text-label-md font-label-md font-bold text-on-secondary-fixed">Registering a new food stall?</p>
              <p className="text-body-sm font-body-sm text-on-secondary-fixed-variant">
                Configure counter location and kitchen access PIN directly on the provider portal after authorization.
              </p>
            </div>
          </div>
        )}

        {/* Developer Sandbox Quick Login Bar */}
        <div className="bg-surface-container-high/40 rounded-xl p-3 border border-outline-variant/40 space-y-2">
          <div className="flex items-center justify-between text-label-sm font-bold text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-primary">terminal</span>
              Dev Quick-Fill Credentials
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-surface px-1.5 py-0.5 rounded text-outline">
              Phase 3 Live
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('student')}
              className="py-1.5 px-2 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-label-sm font-semibold text-on-surface hover:border-primary transition"
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('provider')}
              className="py-1.5 px-2 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-label-sm font-semibold text-on-surface hover:border-primary transition"
            >
              🏪 Provider
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="py-1.5 px-2 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-label-sm font-semibold text-on-surface hover:border-primary transition"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {/* Security Footer Note */}
        <p className="text-center text-body-sm font-body-sm text-outline">
          Campus dining access is encrypted & synchronized with university card services.
        </p>
      </main>
    </div>
  );
};
