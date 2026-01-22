
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { AppState, ChildProfile, Subject, StudySession, UpcomingTest, Evaluation, Parent, Family, SUPER_ADMIN_EMAIL } from './types';
import { DEFAULT_SUBJECTS } from './constants';
// Note: MOCK_CHILDREN removed - families create their own children
import { logger } from './lib';
import {
  // Auth services
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  subscribeToAuthState,
  // Parent services
  getParent,
  createParent,
  updateLastLogin,
  // Family services
  getFamily,
  createFamily,
  // subscribeToFamily - not currently used but available
  // Children services
  subscribeToChildren,
  addChild as addChildService,
  updateChild as updateChildService,
  deleteChild as deleteChildService,
  resetChildStats as resetChildStatsService,
  awardPoints,
  // Sessions services
  subscribeToSessions,
  addSession as addSessionService,
  // Tests services
  subscribeToTests,
  addTest,
  updateTest,
  deleteTest,
  // Subjects services
  subscribeToSubjects,
  addSubject as addSubjectService,
  deleteSubject,
  seedSubjects,
  // Evaluations services
  subscribeToEvaluations,
  addEvaluation as addEvaluationService,
  updateEvaluation as updateEvaluationService,
  deleteEvaluation as deleteEvaluationService,
  // Profile & Learning Signals
  processQuizSignal
} from './services';

interface StoreContextType extends AppState {
  // Auth state
  firebaseUser: FirebaseUser | null;
  parent: Parent | null;
  family: Family | null;
  authLoading: boolean;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Child actions (pinHash optional - can be set later or during creation)
  addChild: (child: Omit<ChildProfile, 'familyId' | 'createdAt' | 'createdBy' | 'pinHash'> & { pinHash?: string }) => Promise<void>;
  updateChild: (id: string, updates: Partial<ChildProfile>) => Promise<void>;
  deleteChild: (id: string) => Promise<void>;
  resetChildStats: (childId: string) => Promise<void>;

  // Session actions
  addSession: (session: Omit<StudySession, 'familyId'>) => Promise<void>;

  // Test actions
  addUpcomingTest: (test: Omit<UpcomingTest, 'familyId'>) => Promise<void>;
  updateUpcomingTest: (testId: string, updates: Partial<UpcomingTest>) => Promise<void>;
  removeUpcomingTest: (testId: string) => Promise<void>;

  // Subject actions
  addSubject: (subject: Subject) => Promise<void>;
  removeSubject: (subjectId: string) => Promise<void>;

  // Evaluation actions
  addEvaluation: (evaluation: Omit<Evaluation, 'familyId'>) => Promise<void>;
  updateEvaluation: (id: string, updates: Partial<Evaluation>) => Promise<void>;
  deleteEvaluation: (id: string, fileUrls?: string[]) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // App data state
  const [state, setState] = useState<AppState>({
    children: [],
    subjects: [],
    sessions: [],
    upcomingTests: [],
    evaluations: [],
    isLoading: true
  });

  // Auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [parent, setParent] = useState<Parent | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Track loading state for each collection individually
  const [loadingStatus, setLoadingStatus] = useState({
    children: true,
    subjects: true,
    sessions: true,
    tests: true,
    evaluations: true
  });

  // Track cleanup functions for data subscriptions
  const [dataUnsubscribers, setDataUnsubscribers] = useState<(() => void)[]>([]);

  // --- Firebase Auth Subscription ---
  useEffect(() => {
    logger.info('store: Setting up auth subscription');

    const unsubscribe = subscribeToAuthState(
      async (user) => {
        setFirebaseUser(user);

        if (user) {
          try {
            // Check if parent exists in Firestore
            let existingParent = await getParent(user.uid);

            if (existingParent) {
              // Existing user - update last login
              await updateLastLogin(user.uid);
              existingParent = { ...existingParent, lastLoginAt: Date.now() };
              setParent(existingParent);

              // Load their family
              const existingFamily = await getFamily(existingParent.familyId);
              setFamily(existingFamily);

              logger.info('store: Existing parent signed in', {
                uid: user.uid,
                email: user.email,
                familyId: existingParent.familyId
              });
            } else {
              // New user - check if super admin (auto-bootstrap)
              const isSuperAdminUser = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

              if (isSuperAdminUser) {
                // Auto-create family and parent for super admin
                logger.info('store: Super admin first login - bootstrapping');

                const newFamily = await createFamily('משפחת לבב', user.uid);
                const newParent = await createParent(
                  user.uid,
                  user.email!,
                  user.displayName || 'Admin',
                  user.photoURL,
                  newFamily.id
                );

                setParent(newParent);
                setFamily(newFamily);

                logger.info('store: Super admin bootstrapped', {
                  familyId: newFamily.id
                });
              } else {
                // New user without parent doc - likely invite-based signup in progress
                // Don't sign out - let SignupPage handle creating parent
                // Protected routes will redirect to login since parent is null
                logger.info('store: New user signed in without parent doc', {
                  email: user.email
                });
                setParent(null);
                setFamily(null);
              }
            }
          } catch (error) {
            logger.error('store: Error during auth state change', {}, error);
            setParent(null);
            setFamily(null);
          }
        } else {
          // User signed out
          setParent(null);
          setFamily(null);
        }

        setAuthLoading(false);
      },
      (error) => {
        logger.error('store: Auth subscription error', {}, error);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // --- Data Subscriptions (depend on family) ---
  useEffect(() => {
    // Clean up previous subscriptions
    dataUnsubscribers.forEach(unsub => unsub());
    setDataUnsubscribers([]);

    // Reset data when family changes
    setState({
      children: [],
      subjects: [],
      sessions: [],
      upcomingTests: [],
      evaluations: [],
      isLoading: true
    });
    setLoadingStatus({
      children: true,
      subjects: true,
      sessions: true,
      tests: true,
      evaluations: true
    });

    // Subjects are global - always subscribe
    const unsubSubjects = subscribeToSubjects(
      (subjectsData) => {
        setState(prev => ({ ...prev, subjects: subjectsData }));
        setLoadingStatus(prev => ({ ...prev, subjects: false }));
      },
      (error) => {
        logger.error('store: Subjects subscription error', {}, error);
        setLoadingStatus(prev => ({ ...prev, subjects: false }));
      }
    );

    const newUnsubscribers = [unsubSubjects];

    if (family) {
      // Subscribe to family-scoped data
      const familyId = family.id;

      // Children (filtered by familyId)
      const unsubChildren = subscribeToChildren(
        (childrenData) => {
          // Client-side filter as backup (Firestore rules are primary)
          const filteredChildren = childrenData.filter(c => c.familyId === familyId);
          setState(prev => ({ ...prev, children: filteredChildren }));
          setLoadingStatus(prev => ({ ...prev, children: false }));
        },
        (error) => {
          logger.error('store: Children subscription error', {}, error);
          setLoadingStatus(prev => ({ ...prev, children: false }));
        },
        familyId
      );

      // Sessions (filtered by familyId)
      const unsubSessions = subscribeToSessions(
        (sessionsData) => {
          const filteredSessions = sessionsData.filter(s => s.familyId === familyId);
          setState(prev => ({ ...prev, sessions: filteredSessions }));
          setLoadingStatus(prev => ({ ...prev, sessions: false }));
        },
        (error) => {
          logger.error('store: Sessions subscription error', {}, error);
          setLoadingStatus(prev => ({ ...prev, sessions: false }));
        },
        familyId
      );

      // Tests (filtered by familyId)
      const unsubTests = subscribeToTests(
        (testsData) => {
          const filteredTests = testsData.filter(t => t.familyId === familyId);
          setState(prev => ({ ...prev, upcomingTests: filteredTests }));
          setLoadingStatus(prev => ({ ...prev, tests: false }));
        },
        (error) => {
          logger.error('store: Tests subscription error', {}, error);
          setLoadingStatus(prev => ({ ...prev, tests: false }));
        },
        familyId
      );

      // Evaluations (filtered by familyId)
      const unsubEvaluations = subscribeToEvaluations(
        familyId,
        (evaluationsData) => {
          const filteredEvaluations = evaluationsData.filter(e => e.familyId === familyId);
          setState(prev => ({ ...prev, evaluations: filteredEvaluations }));
          setLoadingStatus(prev => ({ ...prev, evaluations: false }));
        },
        (error) => {
          logger.error('store: Evaluations subscription error', {}, error);
          setLoadingStatus(prev => ({ ...prev, evaluations: false }));
        }
      );

      newUnsubscribers.push(unsubChildren, unsubSessions, unsubTests, unsubEvaluations);
    } else {
      // No family - mark data as loaded (empty)
      setLoadingStatus(prev => ({
        ...prev,
        children: false,
        sessions: false,
        tests: false,
        evaluations: false
      }));
    }

    setDataUnsubscribers(newUnsubscribers);

    return () => {
      newUnsubscribers.forEach(unsub => unsub());
    };
  }, [family?.id]);

  // Update global isLoading based on individual statuses
  useEffect(() => {
    const isStillLoading = Object.values(loadingStatus).some(status => status);
    if (state.isLoading !== isStillLoading) {
      setState(prev => ({ ...prev, isLoading: isStillLoading }));
    }
  }, [loadingStatus, state.isLoading]);

  // --- CONTENT SEEDING (Subjects only - no mock children) ---
  useEffect(() => {
    if (state.isLoading) return;

    const seedInitialData = async () => {
      try {
        // Only seed Subjects if ZERO subjects exist (global data)
        if (state.subjects.length === 0 && loadingStatus.subjects === false) {
          logger.info('store: Seeding initial subjects');
          await seedSubjects(DEFAULT_SUBJECTS);
        }
        // Note: We no longer seed mock children - families create their own
      } catch (error) {
        logger.error('store: Failed to seed initial content', {}, error);
      }
    };

    const timer = setTimeout(seedInitialData, 1000);
    return () => clearTimeout(timer);
  }, [state.isLoading, state.subjects.length, loadingStatus.subjects]);

  // --- Auth Actions ---
  const signInWithGoogle = useCallback(async () => {
    setAuthLoading(true);
    try {
      await authSignInWithGoogle();
      // Auth state change handler will process the result
    } catch (error) {
      setAuthLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authSignOut();
      setParent(null);
      setFamily(null);
      logger.info('store: User signed out');
    } catch (error) {
      logger.error('store: Sign out failed', {}, error);
      throw error;
    }
  }, []);

  // --- Child Actions ---
  const addChild = useCallback(async (
    childData: Omit<ChildProfile, 'familyId' | 'createdAt' | 'createdBy' | 'pinHash'> & { pinHash?: string }
  ) => {
    if (!family || !parent) {
      throw new Error('Must be logged in to add a child');
    }

    const child: ChildProfile = {
      ...childData,
      familyId: family.id,
      createdAt: Date.now(),
      createdBy: parent.id,
      // Default PIN hash (empty string) - will be set up later or during creation
      pinHash: childData.pinHash || ''
    };

    await addChildService(child);
  }, [family, parent]);

  const updateChild = useCallback(async (id: string, updates: Partial<ChildProfile>) => {
    await updateChildService(id, updates);
  }, []);

  const deleteChild = useCallback(async (id: string) => {
    await deleteChildService(id);
  }, []);

  const resetChildStats = useCallback(async (childId: string) => {
    await resetChildStatsService(childId);
  }, []);

  // --- Session Actions ---
  const addSession = useCallback(async (sessionData: Omit<StudySession, 'familyId'>) => {
    if (!family) {
      throw new Error('Must be logged in to add a session');
    }

    const session: StudySession = {
      ...sessionData,
      familyId: family.id
    };

    // Add the session
    await addSessionService(session);

    // Update child stats
    const child = state.children.find(c => c.id === session.childId);
    if (child) {
      const pointsEarned = session.score * 10;
      await awardPoints(child.id, child.stars, child.streak, pointsEarned);

      // Fire-and-forget: Update learner profile with quiz signal
      // This runs in background and doesn't block the UI
      processQuizSignal(session, child).catch(err => {
        // Error already logged in signalService - just swallow here
        // Profile update failure should never break quiz flow
      });
    }
  }, [family, state.children]);

  // --- Test Actions ---
  const addUpcomingTest = useCallback(async (testData: Omit<UpcomingTest, 'familyId'>) => {
    if (!family) {
      throw new Error('Must be logged in to add a test');
    }

    const test: UpcomingTest = {
      ...testData,
      familyId: family.id
    };

    await addTest(test);
  }, [family]);

  const updateUpcomingTest = useCallback(async (testId: string, updates: Partial<UpcomingTest>) => {
    await updateTest(testId, updates);
  }, []);

  const removeUpcomingTest = useCallback(async (testId: string) => {
    await deleteTest(testId);
  }, []);

  // --- Subject Actions ---
  const addSubject = useCallback(async (subject: Subject) => {
    await addSubjectService(subject);
  }, []);

  const removeSubject = useCallback(async (subjectId: string) => {
    await deleteSubject(subjectId);
  }, []);

  // --- Evaluation Actions ---
  const addEvaluation = useCallback(async (evaluationData: Omit<Evaluation, 'familyId'>) => {
    if (!family) {
      throw new Error('Must be logged in to add an evaluation');
    }

    const evaluation: Evaluation = {
      ...evaluationData,
      familyId: family.id
    };

    await addEvaluationService(evaluation);
  }, [family]);

  const updateEvaluation = useCallback(async (id: string, updates: Partial<Evaluation>) => {
    await updateEvaluationService(id, updates);
  }, []);

  const deleteEvaluation = useCallback(async (id: string, fileUrls?: string[]) => {
    await deleteEvaluationService(id, fileUrls);
  }, []);

  return (
    <StoreContext.Provider value={{
      ...state,
      firebaseUser,
      parent,
      family,
      authLoading,
      signInWithGoogle,
      signOut,
      addChild,
      updateChild,
      deleteChild,
      addSession,
      addUpcomingTest,
      updateUpcomingTest,
      removeUpcomingTest,
      addSubject,
      removeSubject,
      resetChildStats,
      addEvaluation,
      updateEvaluation,
      deleteEvaluation,
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
