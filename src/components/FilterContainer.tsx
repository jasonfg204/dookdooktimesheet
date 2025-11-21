import React from 'react';
import { useAppContext } from '../context/AppContext.tsx';
import './styles/FilterContainer.css';

const FilterContainer: React.FC = () => {
  const {
    year,
    setYear,
    month,
    setMonth,
    isAdmin,
    users,
    selectedUserId,
    setSelectedUserId,
  } = useAppContext();

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYear(parseInt(e.target.value, 10));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonth(parseInt(e.target.value, 10));
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserId(e.target.value);
  };

  return (
    <div className="filter-container">
      <div className="filter-item">
        <label htmlFor="year-input">Year:</label>
        <input id="year-input" type="number" value={year} onChange={handleYearChange} />
      </div>
      <div className="filter-item">
        <label htmlFor="month-select">Month:</label>
        <select id="month-select" value={month} onChange={handleMonthChange}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString('en', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>
      {isAdmin && (
        <div className="filter-item">
          <label htmlFor="user-select">User:</label>
          <select id="user-select" value={selectedUserId} onChange={handleUserChange}>
            <option value="all">All Users</option>
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {user.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default FilterContainer;