import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import '../styles/App.css';
import '../styles/AppLayout.css';

const ProtectedLayout = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getButtonClass = (path: string) => {
    // Check if the current path contains the given path.
    // This is a simple way to handle nested routes if they exist.
    return location.pathname.includes(path) ? 'active' : '';
  };

  return (
    <>
      <nav className="navbar">
        <button onClick={() => navigate('/log-work')} className={getButtonClass('/log-work')}>Log Work</button>
        <button onClick={() => navigate('/summary')} className={getButtonClass('/summary')}>Summary</button>
        <button onClick={() => navigate('/entries-list')} className={getButtonClass('/entries-list')}>Entries List</button>
      </nav>
      <div className="app-content-container">
        <Outlet />
      </div>
    </>
  );
};

export default ProtectedLayout;
