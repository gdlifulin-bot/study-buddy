/**
 * App 根组件
 * 路由配置 + 认证门控
 */

import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import Layout from './components/Layout';
import HomePage from './features/home/HomePage';
import PlannerPage from './features/planner/PlannerPage';
import AIPlanGenerator from './features/planner/AIPlanGenerator';
import CheckinPage from './features/checkin/CheckinPage';
import ReportPage from './features/report/ReportPage';
import SettingsPage from './features/settings/SettingsPage';

export default function App() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return <div className="h-full w-full bg-white" />;
  }

  if (!isLoggedIn) {
    return <AuthModal />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/planner/import" element={<PlannerPage showImport />} />
        <Route path="/planner/ai" element={<AIPlanGenerator />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/checkin/:subject" element={<CheckinPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
