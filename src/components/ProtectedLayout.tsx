import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import '../styles/App.css';
import '../styles/AppLayout.css';

const ProtectedLayout = () => {
  const { user, currentPage, setCurrentPage } = useAppContext();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <nav className="navbar">
        <button onClick={() => setCurrentPage('log-work')} className={currentPage === 'log-work' ? 'active' : ''}>Log Work</button>
        <button onClick={() => setCurrentPage('summary')} className={currentPage === 'summary' ? 'active' : ''}>Summary</button>
        <button onClick={() => setCurrentPage('entries-list')} className={currentPage === 'entries-list' ? 'active' : ''}>Entries List</button>
      </nav>
      <div className="app-content-container">
        <Outlet />
      </div>
    </>
  );
};

export default ProtectedLayout;
