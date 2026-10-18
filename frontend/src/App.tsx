import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RegisterPage } from './pages/RegisterPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { NewAppointmentPage } from './pages/NewAppointmentPage';
import { ServicesPage } from './pages/ServicesPage';
import { UsersPage } from './pages/UsersPage';
import { AccountPage } from './pages/AccountPage';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { AuthProvider } from './lib/auth';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/aceitar-convite" element={<AcceptInvitePage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth allow={['BARBER', 'ADMIN']}>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/meus-agendamentos"
          element={
            <RequireAuth>
              <AppLayout>
                <MyAppointmentsPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/agendar"
          element={
            <RequireAuth>
              <AppLayout>
                <NewAppointmentPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/servicos"
          element={
            <RequireAuth>
              <AppLayout>
                <ServicesPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RequireAuth allow={['ADMIN']}>
              <AppLayout>
                <UsersPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/conta"
          element={
            <RequireAuth>
              <AppLayout>
                <AccountPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
