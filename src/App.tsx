import { useAppContext } from './context/AppContext';
import LoginPage from './pages/LoginPage';
import LogHoursPage from './pages/LogHoursPage';
import SummaryPage from './pages/SummaryPage';
import EntriesListPage from './pages/EntriesListPage';
import './styles/App.css';
import './styles/AppLayout.css';

function App() {
  const { user, currentPage, setCurrentPage } = useAppContext();

  return (
    <div className="App">
      {user ? (
        <>
          <nav className="navbar">
            <button onClick={() => setCurrentPage('log-work')} className={currentPage === 'log-work' ? 'active' : ''}>Log Work</button>
            <button onClick={() => setCurrentPage('summary')} className={currentPage === 'summary' ? 'active' : ''}>Summary</button>
            <button onClick={() => setCurrentPage('entries-list')} className={currentPage === 'entries-list' ? 'active' : ''}>Entries List</button>
          </nav>
          <div className="app-content-container">
            {currentPage === 'log-work' && <LogHoursPage />}
            {currentPage === 'summary' && <SummaryPage />}
            {currentPage === 'entries-list' && <EntriesListPage />}
          </div>
        </>
      ) : (
        <LoginPage />
      )}
    </div>
  );
}

export default App;