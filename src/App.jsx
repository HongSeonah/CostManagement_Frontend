import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthGate } from './components/AuthGate'
import './App.css'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { SystemsPage } from './pages/SystemsPage'
import { InterfacesPage } from './pages/InterfacesPage'
import { ExecutionsPage } from './pages/ExecutionsPage'
import { LogsPage } from './pages/LogsPage'
import { SchedulesPage } from './pages/SchedulesPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <AuthGate>
            <AppShell />
          </AuthGate>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/systems" element={<SystemsPage />} />
        <Route path="/interfaces" element={<InterfacesPage />} />
        <Route path="/executions" element={<ExecutionsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
