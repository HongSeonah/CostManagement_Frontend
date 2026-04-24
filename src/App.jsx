import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import './App.css'
import { DashboardPage } from './pages/DashboardPage'
import { BusinessUnitsPage } from './pages/BusinessUnitsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { CostEntriesPage } from './pages/CostEntriesPage'
import { AllocationPage } from './pages/AllocationPage'

function App() {
  return (
    <Routes>
      <Route
        element={
          <AppShell />
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/business-units" element={<BusinessUnitsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/cost-entries" element={<CostEntriesPage />} />
        <Route path="/allocation" element={<AllocationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
