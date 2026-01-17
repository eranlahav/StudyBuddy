import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  UserPlus,
  ArrowRight,
  Pencil,
  Trash2,
  Users,
  AlertTriangle,
  ArrowLeft,
  Mail,
  Copy,
  Check,
  Clock,
  X,
  UserMinus
} from 'lucide-react';
import { Button } from '../../components/Button';
import {
  getParentsByIds,
  createInvite,
  getFamilyInvites,
  revokeInvite,
  getInviteUrl
} from '../../services';
import { Parent, Invite } from '../../types';
import { formatRelativeDay } from '../../lib';

const MAX_CHILDREN = 5;
const MAX_PARENTS = 2;

export const ParentSettings: React.FC = () => {
  const { children, deleteChild, family, parent } = useStore();
  const navigate = useNavigate();

  // Parent management state
  const [familyParents, setFamilyParents] = useState<Parent[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  // Invite modal state
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  // Delete child modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; childId: string; childName: string }>({
    open: false,
    childId: '',
    childName: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const canAddMore = children.length < MAX_CHILDREN;
  const canInviteParent = familyParents.length < MAX_PARENTS && pendingInvites.filter(i => i.status === 'pending').length === 0;

  // Load family parents and pending invites
  useEffect(() => {
    if (!family) {
      setLoadingParents(false);
      return;
    }

    const loadParentData = async () => {
      try {
        const [parents, invites] = await Promise.all([
          getParentsByIds(family.parentIds),
          getFamilyInvites(family.id)
        ]);
        setFamilyParents(parents);
        setPendingInvites(invites.filter(i => i.status === 'pending'));
      } catch (error) {
        console.error('Failed to load parent data:', error);
      } finally {
        setLoadingParents(false);
      }
    };

    loadParentData();
  }, [family]);

  // Create parent invite
  const handleCreateInvite = async () => {
    if (!family || !parent || !inviteEmail.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteError('כתובת אימייל לא תקינה');
      return;
    }

    setIsCreatingInvite(true);
    setInviteError('');

    try {
      const invite = await createInvite(
        inviteEmail.trim(),
        family.id,
        family.name,
        parent.id
      );
      setPendingInvites(prev => [invite, ...prev]);
      setInviteEmail('');
      setInviteModal(false);
    } catch (error) {
      console.error('Failed to create invite:', error);
      setInviteError('שגיאה ביצירת ההזמנה. נסו שוב.');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  // Copy invite link
  const handleCopyInviteLink = async (invite: Invite) => {
    const url = getInviteUrl(invite.code);
    await navigator.clipboard.writeText(url);
    setCopiedInvite(invite.id);
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  // Revoke invite
  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      console.error('Failed to revoke invite:', error);
    }
  };

  const handleDeleteClick = (childId: string, childName: string) => {
    setDeleteModal({ open: true, childId, childName });
  };

  const confirmDelete = async () => {
    if (!deleteModal.childId) return;
    setIsDeleting(true);
    try {
      await deleteChild(deleteModal.childId);
      setDeleteModal({ open: false, childId: '', childName: '' });
    } catch (error) {
      console.error('Failed to delete child:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/parent')}
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            הגדרות משפחה
          </h1>
          <p className="text-gray-500 mt-1">ניהול ילדים ופרופילים</p>
        </div>
      </div>

      {/* Children Count Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">ילדים במשפחה</h2>
              <p className="text-indigo-100">
                {children.length} מתוך {MAX_CHILDREN} מקומות בשימוש
              </p>
            </div>
          </div>
          <div className="text-4xl font-bold">
            {children.length}/{MAX_CHILDREN}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${(children.length / MAX_CHILDREN) * 100}%` }}
          />
        </div>
      </div>

      {/* Co-Parent Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            הורים במשפחה
          </h3>
          <span className="text-sm text-gray-500">
            {familyParents.length} מתוך {MAX_PARENTS}
          </span>
        </div>

        {/* Parents List */}
        {loadingParents ? (
          <div className="animate-pulse space-y-3">
            <div className="h-14 bg-gray-100 rounded-lg"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {familyParents.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {p.photoURL ? (
                  <img
                    src={p.photoURL}
                    alt={p.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-bold">
                      {p.displayName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{p.displayName}</p>
                  <p className="text-sm text-gray-500">{p.email}</p>
                </div>
                {p.id === parent?.id && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    את/ה
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              הזמנות ממתינות
            </h4>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100"
                >
                  <Mail className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                    <p className="text-xs text-gray-500">
                      נשלח {formatRelativeDay(invite.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyInviteLink(invite)}
                      className="p-2 rounded-lg bg-white text-gray-600 hover:bg-gray-100 transition-colors"
                      title="העתק קישור"
                    >
                      {copiedInvite === invite.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="p-2 rounded-lg bg-white text-red-600 hover:bg-red-50 transition-colors"
                      title="בטל הזמנה"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Button */}
        {canInviteParent && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button
              onClick={() => setInviteModal(true)}
              variant="secondary"
              className="w-full"
            >
              <UserPlus className="ml-2 w-4 h-4" />
              הזמן הורה נוסף
            </Button>
          </div>
        )}

        {!canInviteParent && familyParents.length >= MAX_PARENTS && (
          <p className="mt-4 text-center text-sm text-gray-500">
            הגעתם למגבלת ההורים המקסימלית ({MAX_PARENTS})
          </p>
        )}
      </div>

      {/* Add Child Button */}
      <div className="flex justify-center">
        <Button
          onClick={() => navigate('/parent/settings/add-child')}
          disabled={!canAddMore}
          size="lg"
          className={`${!canAddMore ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <UserPlus className="ml-2 w-5 h-5" />
          הוסף ילד/ה חדש/ה
        </Button>
      </div>

      {!canAddMore && (
        <p className="text-center text-amber-600 text-sm font-medium">
          הגעתם למגבלת הילדים המקסימלית ({MAX_CHILDREN})
        </p>
      )}

      {/* Children List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
          <Users className="w-5 h-5" />
          הילדים שלי
        </h3>

        {children.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">אין עדיין ילדים</h3>
            <p className="text-gray-500 mb-6">הוסיפו את הילד הראשון כדי להתחיל ללמוד!</p>
            <Button onClick={() => navigate('/parent/settings/add-child')}>
              <UserPlus className="ml-2 w-5 h-5" />
              הוסף ילד/ה
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map(child => (
              <div
                key={child.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="text-4xl bg-gray-50 p-2 rounded-xl">{child.avatar}</div>

                  {/* Info */}
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900">{child.name}</h4>
                    <p className="text-sm text-gray-500">{child.grade}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                        ⭐ {child.stars} כוכבים
                      </span>
                      <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        🔥 {child.streak} רצף
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/parent/settings/edit-child/${child.id}`)}
                      className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="ערוך"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(child.id, child.name)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to Dashboard Link */}
      <div className="text-center pt-4">
        <button
          onClick={() => navigate('/parent')}
          className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          ← חזרה ללוח הבקרה
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">מחיקת ילד/ה</h3>
              <p className="text-gray-600 mb-6">
                האם אתם בטוחים שברצונכם למחוק את <strong>{deleteModal.childName}</strong>?
                <br />
                <span className="text-sm text-red-600">פעולה זו לא ניתנת לביטול.</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteModal({ open: false, childId: '', childName: '' })}
                  disabled={isDeleting}
                >
                  ביטול
                </Button>
                <Button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'מוחק...' : 'כן, מחק'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Parent Modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-indigo-600" />
                  הזמנת הורה נוסף
                </h3>
                <button
                  onClick={() => {
                    setInviteModal(false);
                    setInviteEmail('');
                    setInviteError('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                הזינו את כתובת האימייל של ההורה השני. יישלח לו קישור הרשמה למשפחה.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    כתובת אימייל
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setInviteError('');
                    }}
                    placeholder="example@gmail.com"
                    dir="ltr"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  />
                  {inviteError && (
                    <p className="mt-1 text-sm text-red-600">{inviteError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setInviteModal(false);
                      setInviteEmail('');
                      setInviteError('');
                    }}
                    disabled={isCreatingInvite}
                    className="flex-1"
                  >
                    ביטול
                  </Button>
                  <Button
                    onClick={handleCreateInvite}
                    disabled={isCreatingInvite || !inviteEmail.trim()}
                    className="flex-1"
                  >
                    {isCreatingInvite ? (
                      'שולח...'
                    ) : (
                      <>
                        <Mail className="ml-2 w-4 h-4" />
                        צור הזמנה
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
