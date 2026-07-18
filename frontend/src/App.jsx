import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { ModuleProvider } from './context/ModuleContext';
import { ConfigProvider } from './context/ConfigContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';

import ClientsPage from './pages/ClientsPage';
import LeadsPage from './pages/LeadsPage';
import UsersPage from './pages/UsersPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import PipelinePage from './pages/PipelinePage';
import ReportsPage from './pages/ReportsPage';
import InvoicesPage from './pages/InvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoiceViewPage from './pages/InvoiceViewPage';
import EditInvoicePage from './pages/EditInvoicePage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';
import PlansPage from './pages/PlansPage';
import IntegrationsPage from './pages/IntegrationsPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import CheckoutPage from './pages/CheckoutPage';
import CouponsPage from './pages/CouponsPage';
import EmailHistoryPage from './pages/EmailHistoryPage';
import MarketingPage from './pages/MarketingPage';
import WhatsAppChatsPage from './pages/WhatsAppChatsPage';
import WhatsAppChatPage from './pages/WhatsAppChatPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailsPage from './pages/TicketDetailsPage';
import AnnouncementsAdminPage from './pages/AnnouncementsAdminPage';
import AnnouncementsViewPage from './pages/AnnouncementsViewPage';
import ModuleSettingsPage from './pages/ModuleSettingsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import PublicBookingPage from './pages/PublicBookingPage';
import WhatsAppDirectChatPage from './pages/WhatsAppDirectChatPage';
import EventsPage from './pages/EventsPage';
import EventBookingsPage from './pages/EventBookingsPage';
import PublicEventBookingPage from './pages/PublicEventBookingPage';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ConfigProvider>
      <ModuleProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
          },
        }}
      />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage type="client" />}
        />
        <Route
          path="/army"
          element={user ? <Navigate to="/" replace /> : <LoginPage type="admin" />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
        />
        <Route
          path="/reset-password"
          element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />}
        />
        <Route
          path="/"

          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={
            <ProtectedRoute roles={['admin', 'staff']}>
              <ClientsPage />
            </ProtectedRoute>
          } />
          <Route path="leads" element={
            <ProtectedRoute roles={['admin', 'staff']} module="SALES">
              <LeadsPage />
            </ProtectedRoute>
          } />
          <Route path="pipeline" element={
            <ProtectedRoute roles={['admin', 'staff']} module="SALES">
              <PipelinePage />
            </ProtectedRoute>
          } />
          <Route path="billing" element={
            <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'admin']}>
              <BillingPage />
            </ProtectedRoute>
          } />
          <Route path="invoices" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="FINANCE">
              <InvoicesPage />
            </ProtectedRoute>
          } />
          <Route path="invoices/new" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="FINANCE">
              <CreateInvoicePage />
            </ProtectedRoute>
          } />
          <Route path="invoices/:id" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="FINANCE">
              <InvoiceViewPage />
            </ProtectedRoute>
          } />
          <Route path="invoices/:id/edit" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="FINANCE">
              <EditInvoicePage />
            </ProtectedRoute>
          } />
          <Route path="reports" element={
            <ProtectedRoute roles={['admin']} module="REPORTS">
              <ReportsPage />
            </ProtectedRoute>
          } />
          <Route
            path="companies"
            element={
              <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'superadmin_staff']}>
                <CompaniesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="companies/:id"
            element={
              <ProtectedRoute roles={['super_admin', 'superadmin_admin']}>
                <CompanyDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="plans"
            element={
              <ProtectedRoute roles={['super_admin', 'superadmin_admin']}>
                <PlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="integrations" element={
            <ProtectedRoute roles={['admin']}>
              <IntegrationsPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-chats" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="WHATSAPP">
              <WhatsAppChatsPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-chats/:leadId" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="WHATSAPP">
              <WhatsAppChatPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-direct/:phone" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="WHATSAPP">
              <WhatsAppDirectChatPage />
            </ProtectedRoute>
          } />
          <Route path="tickets" element={
            <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'admin', 'manager']}>
              <TicketsPage />
            </ProtectedRoute>
          } />
          <Route path="tickets/:id" element={
            <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'admin', 'manager']}>
              <TicketDetailsPage />
            </ProtectedRoute>
          } />
          <Route path="announcements" element={
            <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'superadmin_staff']}>
              <AnnouncementsAdminPage />
            </ProtectedRoute>
          } />
          <Route path="company-announcements" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <AnnouncementsViewPage />
            </ProtectedRoute>
          } />
          <Route
            path="payment-settings"
            element={
              <ProtectedRoute roles={['super_admin']}>
                <PaymentSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="coupons"
            element={
              <ProtectedRoute roles={['super_admin', 'superadmin_admin']}>
                <CouponsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="marketing"
            element={
              <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'admin']} module="MARKETING">
                <MarketingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="email-history"
            element={
              <ProtectedRoute roles={['super_admin', 'superadmin_admin']} module="MARKETING">
                <EmailHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="module-settings"
            element={
              <ProtectedRoute roles={['admin']}>
                <ModuleSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="appointments"
            element={
              <ProtectedRoute roles={['admin', 'staff']} module="APPOINTMENTS">
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="events"
            element={
              <ProtectedRoute roles={['admin', 'staff', 'manager']} module="EVENTS">
                <EventsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="event-bookings"
            element={
              <ProtectedRoute roles={['admin', 'staff', 'manager']} module="EVENTS">
                <EventBookingsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/event/:slug" element={<PublicEventBookingPage />} />
        <Route path="/book/:bookingSlug/:slug" element={<PublicBookingPage />} />
        <Route path="/checkout/:planSlug" element={<CheckoutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ModuleProvider>
    </ConfigProvider>
  );
}
