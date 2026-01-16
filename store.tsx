
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, ChildProfile, Subject, StudySession, UpcomingTest } from './types';
import { INITIAL_STATE, DEFAULT_SUBJECTS, MOCK_CHILDREN, MOCK_TESTS } from './constants';
import { db } from './firebaseConfig'; // Removed auth import
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

// Define simple User type locally since we aren't using Firebase Auth types
export interface User {
  email: string;
}

interface StoreContextType extends AppState {
  user: User | null;
  loadingAuth: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  addChild: (child: ChildProfile) => Promise<void>;
  updateChild: (id: string, updates: Partial<ChildProfile>) => Promise<void>;
  addSession: (session: StudySession) => Promise<void>;
  addUpcomingTest: (test: UpcomingTest) => Promise<void>;
  updateUpcomingTest: (testId: string, updates: Partial<UpcomingTest>) => Promise<void>;
  removeUpcomingTest: (testId: string) => Promise<void>;
  addSubject: (subject: Subject) => Promise<void>;
  removeSubject: (subjectId: string) => Promise<void>;
  resetChildStats: (childId: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    children: [],
    subjects: [],
    sessions: [],
    upcomingTests: [],
    isLoading: true
  });

  // Initialize user from LocalStorage for persistence
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sb_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Track loading state for each collection individually
  const [loadingStatus, setLoadingStatus] = useState({
    children: true,
    subjects: true,
    sessions: true,
    tests: true
  });

  // --- Firestore Subscriptions ---
  useEffect(() => {
    // 1. Children
    const unsubChildren = onSnapshot(collection(db, 'children'), (snap) => {
      const childrenData = snap.docs.map(doc => doc.data() as ChildProfile);
      setState(prev => ({ ...prev, children: childrenData }));
      setLoadingStatus(prev => ({ ...prev, children: false }));
    }, (error) => {
      console.error("Error fetching children:", error);
      setLoadingStatus(prev => ({ ...prev, children: false }));
    });

    // 2. Subjects
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      const subjectsData = snap.docs.map(doc => doc.data() as Subject);
      setState(prev => ({ ...prev, subjects: subjectsData }));
      setLoadingStatus(prev => ({ ...prev, subjects: false }));
    }, (error) => {
      console.error("Error fetching subjects:", error);
      setLoadingStatus(prev => ({ ...prev, subjects: false }));
    });

    // 3. Sessions
    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snap) => {
      const sessionsData = snap.docs.map(doc => doc.data() as StudySession);
      // Sort in memory for now, easier than composite indexes for simple app
      sessionsData.sort((a, b) => b.date - a.date); 
      setState(prev => ({ ...prev, sessions: sessionsData }));
      setLoadingStatus(prev => ({ ...prev, sessions: false }));
    }, (error) => {
      console.error("Error fetching sessions:", error);
      setLoadingStatus(prev => ({ ...prev, sessions: false }));
    });

    // 4. Upcoming Tests
    const unsubTests = onSnapshot(collection(db, 'upcomingTests'), (snap) => {
      const testsData = snap.docs.map(doc => doc.data() as UpcomingTest);
      setState(prev => ({ ...prev, upcomingTests: testsData }));
      setLoadingStatus(prev => ({ ...prev, tests: false }));
    }, (error) => {
      console.error("Error fetching tests:", error);
      setLoadingStatus(prev => ({ ...prev, tests: false }));
    });

    return () => {
      unsubChildren();
      unsubSubjects();
      unsubSessions();
      unsubTests();
    };
  }, []);

  // Update global isLoading based on individual statuses
  useEffect(() => {
    const isStillLoading = Object.values(loadingStatus).some(status => status);
    if (state.isLoading !== isStillLoading) {
      setState(prev => ({ ...prev, isLoading: isStillLoading }));
    }
  }, [loadingStatus, state.isLoading]);

  // --- CONTENT SEEDING ---
  useEffect(() => {
    if (state.isLoading) return;

    const seedInitialData = async () => {
      const batch = writeBatch(db);
      let updatesCount = 0;

      // 1. Only seed Subjects if ZERO subjects exist
      if (state.subjects.length === 0 && loadingStatus.subjects === false) {
        console.log("Seeding initial subjects...");
        DEFAULT_SUBJECTS.forEach(sub => {
           batch.set(doc(db, 'subjects', sub.id), sub);
           updatesCount++;
        });
      }

      // 2. Only seed Children if ZERO children exist
      if (state.children.length === 0 && loadingStatus.children === false) {
        console.log("Seeding initial children...");
        MOCK_CHILDREN.forEach(mockChild => {
           batch.set(doc(db, 'children', mockChild.id), mockChild);
           updatesCount++;
        });
      }
      
      if (updatesCount > 0) {
        try {
            await batch.commit();
        } catch (e) {
            console.error("Failed to seed initial content:", e);
        }
      }
    };

    const timer = setTimeout(seedInitialData, 1000);
    return () => clearTimeout(timer);

  }, [
    state.isLoading, 
    state.children, 
    state.subjects.length, 
    loadingStatus
  ]);

  // --- Mock Auth Actions ---
  const login = async (email: string, pass: string) => {
    setLoadingAuth(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (email.toLowerCase() === 'admin' && pass === 'admin') {
      const mockUser = { email: 'admin' };
      setUser(mockUser);
      localStorage.setItem('sb_user', JSON.stringify(mockUser));
      setLoadingAuth(false);
    } else {
      setLoadingAuth(false);
      throw new Error('AUTH_FAILED');
    }
  };

  const signup = async (email: string, pass: string) => {
    // For this mock, signup is the same as login
    return login(email, pass);
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('sb_user');
  };

  // --- Actions ---

  const addChild = async (child: ChildProfile) => {
    await setDoc(doc(db, 'children', child.id), child);
  };

  const updateChild = async (id: string, updates: Partial<ChildProfile>) => {
    await updateDoc(doc(db, 'children', id), updates);
  };

  const addSession = async (session: StudySession) => {
    // 1. Add the session
    await setDoc(doc(db, 'sessions', session.id), session);

    // 2. Update child stats
    const child = state.children.find(c => c.id === session.childId);
    if (child) {
      const pointsEarned = session.score * 10;
      await updateDoc(doc(db, 'children', child.id), {
        stars: child.stars + pointsEarned,
        streak: child.streak + 1 // Simple logic, assumes one session per day for streak
      });
    }
  };

  const addUpcomingTest = async (test: UpcomingTest) => {
    await setDoc(doc(db, 'upcomingTests', test.id), test);
  };

  const updateUpcomingTest = async (testId: string, updates: Partial<UpcomingTest>) => {
    await updateDoc(doc(db, 'upcomingTests', testId), updates);
  };

  const removeUpcomingTest = async (testId: string) => {
    await deleteDoc(doc(db, 'upcomingTests', testId));
  };

  const addSubject = async (subject: Subject) => {
    await setDoc(doc(db, 'subjects', subject.id), subject);
  };

  const removeSubject = async (subjectId: string) => {
    await deleteDoc(doc(db, 'subjects', subjectId));
  };

  const resetChildStats = async (childId: string) => {
    await updateDoc(doc(db, 'children', childId), {
      stars: 0,
      streak: 0
    });
  };

  return (
    <StoreContext.Provider value={{ 
      ...state, 
      user,
      loadingAuth,
      login,
      signup,
      logout,
      addChild, 
      updateChild, 
      addSession, 
      addUpcomingTest, 
      updateUpcomingTest, 
      removeUpcomingTest, 
      addSubject, 
      removeSubject,
      resetChildStats, 
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
