import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LogHoursPage from './pages/LogHoursPage';
import SummaryPage from './pages/SummaryPage';
import EntriesListPage from './pages/EntriesListPage';
import ProtectedLayout from './components/ProtectedLayout';
import './styles/App.css';
import './styles/AppLayout.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/log-work" replace />} />
          <Route path="log-work" element={<LogHoursPage />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="entries-list" element={<EntriesListPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;