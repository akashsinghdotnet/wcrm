import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { ModuleProvider } from './context/ModuleContext';
import { useConfig } from './context/ConfigContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import UsersPage from './pages/UsersPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import PipelinePage from './pages/PipelinePage';
import ReportsPage from './pages/ReportsPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailsPage from './pages/CompanyDetailsPage';
import PlansPage from './pages/PlansPage';
import IntegrationsPage from './pages/IntegrationsPage';
import PaymentSettingsPage from './pages/PaymentSettingsPage';
import CouponsPage from './pages/CouponsPage';
import CheckoutPage from './pages/CheckoutPage';
import WhatsAppChatsPage from './pages/WhatsAppChatsPage';
import WhatsAppChatPage from './pages/WhatsAppChatPage';
import WhatsAppDirectChatPage from './pages/WhatsAppDirectChatPage';
import WhatsAppContactsPage from './pages/WhatsAppContactsPage';
import WhatsAppBroadcastPage from './pages/WhatsAppBroadcastPage';
import NotificationsPage from './pages/NotificationsPage';
import AutomationsPage from './pages/AutomationsPage';
import FlowsPage from './pages/FlowsPage';
import AiAgentsPage from './pages/AiAgentsPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailsPage from './pages/TicketDetailsPage';
import AnnouncementsAdminPage from './pages/AnnouncementsAdminPage';
import AnnouncementsViewPage from './pages/AnnouncementsViewPage';
import ModuleSettingsPage from './pages/ModuleSettingsPage';

export default function App() {
  const { user, loading } = useAuth();
  const { config } = useConfig() || {};
  const isSelfHosted = config?.deployment_mode === 'self_hosted';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
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
          element={
            isSelfHosted ? (
              <Navigate to="/login" replace />
            ) : user ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage type="admin" />
            )
          }
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
          <Route path="leads" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="SALES">
              <LeadsPage />
            </ProtectedRoute>
          } />
          <Route path="pipeline" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']} module="SALES">
              <PipelinePage />
            </ProtectedRoute>
          } />
          <Route path="billing" element={
            <ProtectedRoute roles={['super_admin', 'superadmin_admin', 'admin']}>
              <BillingPage />
            </ProtectedRoute>
          } />

          <Route path="reports" element={
            <ProtectedRoute roles={['admin', 'manager']} module="REPORTS">
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
          {/* Core Wcrm Routes */}
          <Route path="inbox" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppChatsPage />
            </ProtectedRoute>
          } />
          <Route path="inbox/:leadId" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppChatPage />
            </ProtectedRoute>
          } />
          <Route path="notifications" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <NotificationsPage />
            </ProtectedRoute>
          } />
          <Route path="contacts" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppContactsPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-contacts" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppContactsPage />
            </ProtectedRoute>
          } />
          <Route path="broadcasts" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppBroadcastPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-broadcast" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppBroadcastPage />
            </ProtectedRoute>
          } />
          <Route path="automations" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <AutomationsPage />
            </ProtectedRoute>
          } />
          <Route path="flows" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <FlowsPage />
            </ProtectedRoute>
          } />
          <Route path="ai-agents" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <AiAgentsPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-chats" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppChatsPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-chats/:leadId" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppChatPage />
            </ProtectedRoute>
          } />
          <Route path="whatsapp-direct/:phone" element={
            <ProtectedRoute roles={['admin', 'manager', 'staff']}>
              <WhatsAppDirectChatPage />
            </ProtectedRoute>
          } />
          {!isSelfHosted && (
            <>
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
            </>
          )}
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
            path="module-settings"
            element={
              <ProtectedRoute roles={['admin']}>
                <ModuleSettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="/checkout/:planSlug" element={<CheckoutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ModuleProvider>
  );
}
