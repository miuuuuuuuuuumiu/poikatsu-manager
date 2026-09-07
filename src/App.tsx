import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ProjectListPage } from './pages/ProjectListPage'
import { ProjectFormPage } from './pages/ProjectFormPage'
import { SchedulePage } from './pages/SchedulePage'
import { ReportPage } from './pages/ReportPage'
import { SettingsPage } from './pages/SettingsPage'
import { PointSitesPage } from './pages/PointSitesPage'
import { TrashPage } from './pages/TrashPage'
import { seedPointSitesIfEmpty } from './lib/repositories/pointSites'

function App() {
  useEffect(() => {
    void seedPointSitesIfEmpty()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/:id" element={<ProjectFormPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/point-sites" element={<PointSitesPage />} />
        <Route path="/settings/trash" element={<TrashPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
