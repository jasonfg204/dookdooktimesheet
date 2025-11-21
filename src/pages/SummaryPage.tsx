import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAppContext } from '../context/AppContext.tsx';
import './styles/SummaryPage.css';
import FilterContainer from '../components/FilterContainer';

interface UserSummary {
  totalHours: number;
}

interface SummaryData {
  [userId: string]: number;
}

const SummaryPage: React.FC = () => {
  const { user, isAdmin, users, year, month, selectedUserId } = useAppContext();
  const [summary, setSummary] = useState<SummaryData>({});
  const [totalHours, setTotalHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!user) {
          setLoading(false);
          return;
        }

        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

        if (isAdmin) {
          if (selectedUserId && selectedUserId !== 'all') {
            // Fetch summary for a single selected user
            const summaryDocRef = doc(db, 'monthlySummaries', yearMonth, 'users', selectedUserId);
            const docSnap = await getDoc(summaryDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data() as UserSummary;
              setSummary({ [selectedUserId]: data.totalHours || 0 });
            } else {
              setSummary({});
            }
          } else {
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
          }
        } else {
          // Non-admin fetches only their own summary
          const summaryDocRef = doc(db, 'monthlySummaries', yearMonth, 'users', user.uid);
          const docSnap = await getDoc(summaryDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserSummary;
            setTotalHours(data.totalHours || 0);
          } else {
            setTotalHours(0); // No summary doc, so total is 0
          }
        }
      } catch (err) {
        console.error('Error fetching summary: ', err);
        setError('Failed to load summary data.');
        setSummary({});
        setTotalHours(0);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user, isAdmin, year, month, selectedUserId]);

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
  // Admin View
  if (isAdmin) {
    const selectedUserName = users.find(u => u.uid === selectedUserId)?.displayName;

    console.log("hihihs");

    return (
      <div className="summary-page">
        <FilterContainer />
        <h2>
          {selectedUserId && selectedUserId !== 'all'
            ? `${selectedUserName}'s Hours Summary`
            : 'All User Hours Summary'}
        </h2>
        {Object.keys(summary).length === 0 ? (
          <p>
            {selectedUserId && selectedUserId !== 'all'
              ? `No summary found for ${selectedUserName} for the selected period.`
              : 'No user summaries found for the selected period.'}
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
  }

  // Regular User View
  return (
    <div className="summary-page">
      <FilterContainer />
      <h2>My Hours Summary</h2>
      <div className="user-summary-card">
        <p>Total Hours Logged for {month}/{year}</p>
        <div className="user-total-hours">{totalHours.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default SummaryPage;

