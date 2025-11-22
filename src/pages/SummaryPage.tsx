import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAppContext } from '../context/AppContext';
import './styles/SummaryPage.css';
import FilterContainer from '../components/FilterContainer';

interface UserSummary {
  totalHours: number;
}

interface SummaryData {
  [userId: string]: number;
}

const SummaryPage = () => {
  const { users, year, month, selectedUserId } = useAppContext();
  const [summary, setSummary] = useState<SummaryData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);

        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

        if (selectedUserId === 'all') {
          // Fetch summaries for all users
          const usersSummaryRef = collection(db, 'monthlySummaries', yearMonth, 'users');
          const querySnapshot = await getDocs(usersSummaryRef);

          if (querySnapshot.empty) {
            setSummary({});
          } else {
            const summaryData = querySnapshot.docs.reduce((acc, doc) => {
              const data = doc.data() as UserSummary;
              acc[doc.id] = data.totalHours || 0;
              return acc;
            }, {} as SummaryData);
            setSummary(summaryData);
          }
        } else {
          // Fetch summary for a single selected user
          const summaryDocRef = doc(db, 'monthlySummaries', yearMonth, 'users', selectedUserId);
          const docSnap = await getDoc(summaryDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserSummary;
            setSummary({ [selectedUserId]: data.totalHours || 0 });
          } else {
            setSummary({});
          }
        }
      } catch (err) {
        console.error('Error fetching summary: ', err);
        setError('Failed to load summary data.');
        setSummary({});
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [year, month, selectedUserId]);

  const getUserDisplayName = (userId: string) => {
    const foundUser = users.find((u) => u.uid === userId);
    return foundUser ? foundUser.displayName : userId;
  };

  if (loading) {
    return <div className="summary-page">Loading summary...</div>;
  }

  if (error) {
    return <div className="summary-page error-message">{error}</div>;
  }

  const selectedUserName = users.find(u => u.uid === selectedUserId)?.displayName;

  return (
    <div className="summary-page">
      <FilterContainer />
      <h2>
        {selectedUserId === 'all'
          ? 'All User Hours Summary'
          : `${selectedUserName}'s Hours Summary`}
      </h2>
      {Object.keys(summary).length === 0 ? (
        <p>
          {selectedUserId === 'all'
            ? 'No user summaries found for the selected period.'
            : `No summary found for ${selectedUserName} for the selected period.`}
        </p>
      ) : (
        <ul className="summary-list">
          {Object.entries(summary).map(([userId, hours]) => (
            <li key={userId} className="summary-item">
              <span className="user-id">{getUserDisplayName(userId)}</span>
              <span className="total-hours">{hours.toFixed(2)} hours</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SummaryPage;

