import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebaseConfig';
import { useAppContext } from '../context/AppContext.tsx';
import FilterContainer from '../components/FilterContainer';
import './styles/EntriesListPage.css';

interface Entry {
  id: string;
  userId: string;
  userName?: string; // Optional: To display the user's name
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  notes?: string;
}

const EntriesListPage: React.FC = () => {
  const { user, isAdmin, users, selectedUserId, year, month, setCurrentPage, setEditingEntryId } = useAppContext();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Effect to fetch entries based on the selected filters
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    const entriesCollection = collection(db, 'entries');
    let q;

    if (isAdmin) {
      const queryConstraints = [
        where('year', '==', year),
        where('month', '==', month),
        ...(selectedUserId !== 'all' ? [where('userId', '==', selectedUserId)] : []),
        orderBy('date', 'desc'),
        orderBy('startTime', 'desc')
      ];
      q = query(entriesCollection, ...queryConstraints);
    } else {
      // A non-admin should only ever be able to query their own entries
      q = query(
        entriesCollection,
        where('userId', '==', user.uid),
        where('year', '==', year),
        where('month', '==', month),
        orderBy('date', 'desc'),
        orderBy('startTime', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const fetchedEntries: Entry[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const userName = users.find(u => u.uid === data.userId)?.displayName || data.userId;
          return { id: doc.id, ...data, userName } as Entry;
        });
        setEntries(fetchedEntries);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching entries: ', err);
        setError('Failed to load entries.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedUserId, isAdmin, year, month, users]);

  const handleRecalculate = async () => {
    const targetUser = selectedUserId === 'all' 
      ? 'all users' 
      : users.find(u => u.uid === selectedUserId)?.displayName || 'the selected user';
    
    if (!window.confirm(`This will recalculate the monthly summary for ${targetUser} for ${year}-${month}. This is a heavy operation. Continue?`)) {
      return;
    }

    setIsRecalculating(true);
    try {
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
      const payload = {
        yearMonth,
        userId: selectedUserId === 'all' ? null : selectedUserId,
      };

      const recalculateFn = httpsCallable(functions, 'recalculateMonthlySummary');
      const result = await recalculateFn(payload);
      
      alert(`Recalculation successful: ${(result.data as any).message}`);

    } catch (err: any) {
      console.error('Recalculation failed:', err);
      alert(`An error occurred: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }
    try {
      const entryRef = doc(db, 'entries', entryId);
      await deleteDoc(entryRef);
      // The onSnapshot listener will automatically update the UI.
      // The aggregateUserHours function will automatically be triggered to update the summary.
    } catch (err) {
      console.error('Error deleting entry: ', err);
      alert('Failed to delete entry.');
    }
  };

  const handleEdit = (entryId: string) => {
    setEditingEntryId(entryId);
    setCurrentPage('log-work');
  };

  if (loading) {
    return <div className="entries-list-page">Loading entries...</div>;
  }

  if (error) {
    return <div className="entries-list-page error-message">{error}</div>;
  }

  return (
    <div className="entries-list-page">
     <FilterContainer />
     <div className="admin-actions">
        {isAdmin && (
          <button onClick={handleRecalculate} disabled={isRecalculating}>
            {isRecalculating ? 'Recalculating...' : 'Recalculate Summaries'}
          </button>
        )}
      </div>
     <h2>Entries List</h2>

      {entries.length === 0 ? (
        <p>No work sessions found for the selected filter.</p>
      ) : (
        <div className="entries-table-container">
          <table className="entries-table">
            <thead>
              <tr>
                {isAdmin && <th>User</th>}
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Hours</th>
                <th>Notes</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  {isAdmin && <td data-label="User">{entry.userName}</td>}
                  <td data-label="Date">{entry.date}</td>
                  <td data-label="Start Time">{entry.startTime}</td>
                  <td data-label="End Time">{entry.endTime}</td>
                  <td data-label="Hours">{entry.hours.toFixed(2)}</td>
                  <td data-label="Notes">{entry.notes}</td>
                  {isAdmin && (
                    <td data-label="Actions">
                      <button className="edit-btn" onClick={() => handleEdit(entry.id)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(entry.id)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EntriesListPage;