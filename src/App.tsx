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
import { UpdateNotification } from './components/UpdateNotification'
import { seedPointSitesIfEmpty } from './lib/repositories/pointSites'
import { useCloudSync } from './hooks/useCloudSync'

function App() {
  useEffect(() => {
    void seedPointSitesIfEmpty()
  }, [])

  useCloudSync()

  return (
    // GitHub Pagesなど、ドメイン直下ではなくサブフォルダ（/poikatsu-manager/ など）で
    // 公開された場合でも画面遷移が正しく動くよう、Viteのbase設定をbasenameに渡す。
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <UpdateNotification />
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
