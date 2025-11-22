import { createContext, useState, useEffect, useContext, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export type Page = 'log-work' | 'summary' | 'entries-list';

interface UserData {
  uid: string;
  displayName: string;
}

interface AppContextType {
  user: User | null;
  userRole: string | null;
  isAdmin: boolean;
  users: UserData[];
  loading: boolean;
  selectedUserId: 'all' | string;
  setSelectedUserId: Dispatch<SetStateAction<'all' | string>>;
  year: number;
  setYear: Dispatch<SetStateAction<number>>;
  month: number;
  setMonth: Dispatch<SetStateAction<number>>;
  currentPage: Page;
  setCurrentPage: Dispatch<SetStateAction<Page>>;
  editingEntryId: string | null;
  setEditingEntryId: Dispatch<SetStateAction<string | null>>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<'all' | string>('all');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [currentPage, setCurrentPage] = useState<Page>('log-work');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Create user document on first sign-in
          await setDoc(userDocRef, {
            displayName: currentUser.displayName,
            role: 'user',
          });
          setUserRole('user');
        } else if (userDoc.data().role === 'admin') {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (user) {
      setSelectedUserId(isAdmin ? 'all' : user.uid);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          displayName: doc.data().displayName || doc.id,
        }));
        setUsers(usersList);
      };
      fetchUsers();
    } else if (user) {
      setUsers([{ uid: user.uid, displayName: user.displayName || user.uid }]);
    } else {
      setUsers([]);
    }
  }, [isAdmin, user]);

  const value = {
    user,
    userRole,
    isAdmin,
    users,
    loading,
    selectedUserId,
    setSelectedUserId,
    year,
    setYear,
    month,
    setMonth,
    currentPage,
    setCurrentPage,
    editingEntryId,
    setEditingEntryId,
  };

  return <AppContext.Provider value={value}>{!loading && children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
