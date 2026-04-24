import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import './App.css'
import { DashboardPage } from './pages/DashboardPage'
import { BusinessUnitsPage } from './pages/BusinessUnitsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { CostEntriesPage } from './pages/CostEntriesPage'
import { InternalTransfersPage } from './pages/InternalTransfersPage'
import { StandardCostsPage } from './pages/StandardCostsPage'
import { AllocationPage } from './pages/AllocationPage'
import { AnalysisPage } from './pages/AnalysisPage'

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
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/cost-entries" element={<CostEntriesPage />} />
        <Route path="/internal-transfers" element={<InternalTransfersPage />} />
        <Route path="/standard-costs" element={<StandardCostsPage />} />
        <Route path="/allocation" element={<AllocationPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
