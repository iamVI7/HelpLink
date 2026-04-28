import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider }    from './context/AuthContext';
import { RequestProvider } from './context/RequestContext';
import { SocketProvider }  from './context/SocketContext';

import ProtectedRoute from './components/ProtectedRoute';
import Navbar         from './components/Navbar';
import ScrollManager  from './components/ScrollManager';

import LandingPage          from './pages/LandingPage';
import Login                from './pages/Login';
import Register             from './pages/Register';
import Dashboard            from './pages/Dashboard';
import CreateRequest        from './pages/CreateRequest';
import MapView              from './pages/MapView';
import EmergencyProfilePage from './pages/EmergencyProfilePage';
import GuestTracking        from './pages/GuestTracking';
import TrackingPage         from './pages/TrackingPage';
import MapPage              from './pages/MapPage';
import ProfilePage          from './pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <RequestProvider>
        <SocketProvider>
          <div className="min-h-screen bg-stone-50">

            <Navbar />

            <Toaster
              position="top-center"
              containerStyle={{ top: 80 }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#ffffff',
                  color: '#1a1714',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '999px',
                  padding: '12px 20px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                },
                success: {
                  duration: 3000,
                  style: {
                    background: '#ffffff',
                    color: '#15803d',
                    border: '1px solid rgba(22,163,74,0.2)',
                    borderRadius: '999px',
                  },
                },
                error: {
                  style: {
                    background: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: '999px',
                  },
                },
              }}
            />

            <ScrollManager />

            <Routes>

              {/* Public Routes */}
              <Route path="/"         element={<LandingPage />} />
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Guest SOS tracking — public */}
              <Route path="/tracking/:requestId" element={<GuestTracking />} />

              {/* Logged-in user request tracking */}
              <Route
                path="/my-tracking/:requestId"
                element={
                  <ProtectedRoute>
                    <TrackingPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <MapView />
                  </ProtectedRoute>
                }
              />

              {/* User-only Routes */}
              <Route
                path="/create-request"
                element={
                  <ProtectedRoute userOnly={true}>
                    <CreateRequest />
                  </ProtectedRoute>
                }
              />

              {/* ✅ ADDED — Enhance Request route (users only, reuses CreateRequest in enhance mode) */}
              <Route
                path="/edit-request/:requestId"
                element={
                  <ProtectedRoute userOnly={true}>
                    <CreateRequest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/emergency-profile"
                element={
                  <ProtectedRoute userOnly={true}>
                    <EmergencyProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute userOnly={true}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />

              <Route path="/map/:id" element={<MapPage />} />

            </Routes>
          </div>
        </SocketProvider>
      </RequestProvider>
    </AuthProvider>
  );
}

export default App;