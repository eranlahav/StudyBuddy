/**
 * FamilyEditModal - Admin modal for editing family details
 *
 * Tabbed interface with:
 * - Details: Edit family name
 * - Parents: View/remove parents, invite new
 * - Children: View children with stats
 * - Statistics: Per-family analytics
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserMinus,
  UserPlus,
  Baby,
  BarChart3,
  Pencil,
  Save,
  Calendar,
  Star,
  Flame,
  Clock,
  Mail,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Button } from './Button';
import { Family, Parent, ChildProfile, Invite } from '../types';
import {
  getParentsByIds,
  updateFamily,
  removeParentFromFamily,
  blockParent,
  createInvite,
  getFamilyInvites,
  revokeInvite,
  getInviteUrl
} from '../services';
import { getFamilyStats, FamilyStats } from '../services/statsService';
import { formatRelativeDay } from '../lib';

interface FamilyEditModalProps {
  family: Family;
  children: ChildProfile[];
  onClose: () => void;
  onUpdate?: () => void;
}

type TabId = 'details' | 'parents' | 'children' | 'stats';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'details', label: 'פרטים', icon: <Pencil className="w-4 h-4" /> },
  { id: 'parents', label: 'הורים', icon: <Users className="w-4 h-4" /> },
  { id: 'children', label: 'ילדים', icon: <Baby className="w-4 h-4" /> },
  { id: 'stats', label: 'סטטיסטיקות', icon: <BarChart3 className="w-4 h-4" /> }
];

export const FamilyEditModal: React.FC<FamilyEditModalProps> = ({
  family,
  children,
  onClose,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('details');

  // Details state
  const [familyName, setFamilyName] = useState(family.name);
  const [isSaving, setIsSaving] = useState(false);

  // Parents state
  const [parents, setParents] = useState<Parent[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);

  // Invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  // Remove parent confirmation
  const [removeConfirm, setRemoveConfirm] = useState<{ uid: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Stats state
  const [stats, setStats] = useState<FamilyStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load parents and invites
  useEffect(() => {
    const loadParentData = async () => {
      setLoadingParents(true);
      try {
        const [parentsData, invitesData] = await Promise.all([
          getParentsByIds(family.parentIds),
          getFamilyInvites(family.id)
        ]);
        setParents(parentsData);
        setPendingInvites(invitesData.filter(i => i.status === 'pending'));
      } catch (error) {
        console.error('Failed to load parent data:', error);
      } finally {
        setLoadingParents(false);
      }
    };

    loadParentData();
  }, [family.parentIds, family.id]);

  // Load stats when tab is selected
  useEffect(() => {
    if (activeTab === 'stats' && !stats && !loadingStats) {
      setLoadingStats(true);
      getFamilyStats(family.id)
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoadingStats(false));
    }
  }, [activeTab, family.id, stats, loadingStats]);

  // Save family name
  const handleSaveName = async () => {
    if (familyName.trim() === family.name) return;

    setIsSaving(true);
    try {
      await updateFamily(family.id, { name: familyName.trim() });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update family name:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Create invite
  const handleCreateInvite = async () => {
    if (!inviteEmail.trim()) return;

    setIsCreatingInvite(true);
    try {
      const invite = await createInvite(
        inviteEmail.trim(),
        family.id,
        family.name,
        'admin' // Admin created
      );
      setPendingInvites(prev => [invite, ...prev]);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to create invite:', error);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  // Copy invite link
  const handleCopyInvite = async (invite: Invite) => {
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

  // Remove parent from family
  const handleRemoveParent = async () => {
    if (!removeConfirm) return;

    setIsRemoving(true);
    try {
      const success = await removeParentFromFamily(family.id, removeConfirm.uid);
      if (success) {
        await blockParent(removeConfirm.uid);
        setParents(prev => prev.filter(p => p.id !== removeConfirm.uid));
        onUpdate?.();
      } else {
        alert('לא ניתן להסיר את ההורה היחיד במשפחה');
      }
    } catch (error) {
      console.error('Failed to remove parent:', error);
    } finally {
      setIsRemoving(false);
      setRemoveConfirm(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            עריכת משפחה: {family.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם המשפחה
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="משפחת..."
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={isSaving || familyName.trim() === family.name}
                  >
                    <Save className="ml-2 w-4 h-4" />
                    {isSaving ? 'שומר...' : 'שמור'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">נוצרה בתאריך</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(family.createdAt).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">מזהה משפחה</p>
                  <p className="font-mono text-sm text-gray-600">{family.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Parents Tab */}
          {activeTab === 'parents' && (
            <div className="space-y-6">
              {loadingParents ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {parents.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
                      >
                        {p.photoURL ? (
                          <img
                            src={p.photoURL}
                            alt={p.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-bold text-lg">
                              {p.displayName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{p.displayName}</p>
                          <p className="text-sm text-gray-500">{p.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            התחבר לאחרונה: {formatRelativeDay(p.lastLoginAt)}
                          </p>
                        </div>
                        {p.isSuperAdmin && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            מנהל ראשי
                          </span>
                        )}
                        {parents.length > 1 && !p.isSuperAdmin && (
                          <button
                            onClick={() => setRemoveConfirm({ uid: p.id, name: p.displayName })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="הסר מהמשפחה"
                          >
                            <UserMinus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pending Invites */}
                  {pendingInvites.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
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
                                נוצר {formatRelativeDay(invite.createdAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleCopyInvite(invite)}
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
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invite New Parent */}
                  {parents.length < 2 && (
                    <div className="pt-4 border-t border-gray-200">
                      {showInviteForm ? (
                        <div className="space-y-3">
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="כתובת אימייל של ההורה"
                            dir="ltr"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex gap-3">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setShowInviteForm(false);
                                setInviteEmail('');
                              }}
                              className="flex-1"
                            >
                              ביטול
                            </Button>
                            <Button
                              onClick={handleCreateInvite}
                              disabled={isCreatingInvite || !inviteEmail.trim()}
                              className="flex-1"
                            >
                              {isCreatingInvite ? 'יוצר...' : 'צור הזמנה'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setShowInviteForm(true)}
                          variant="secondary"
                          className="w-full"
                        >
                          <UserPlus className="ml-2 w-4 h-4" />
                          הזמן הורה נוסף
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Children Tab */}
          {activeTab === 'children' && (
            <div className="space-y-4">
              {children.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Baby className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>אין ילדים במשפחה זו</p>
                </div>
              ) : (
                children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="text-4xl bg-white p-2 rounded-xl shadow-sm">
                      {child.avatar}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{child.name}</h4>
                      <p className="text-sm text-gray-500">{child.grade}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-yellow-600">
                        <Star className="w-4 h-4" />
                        {child.stars}
                      </span>
                      <span className="flex items-center gap-1 text-orange-600">
                        <Flame className="w-4 h-4" />
                        {child.streak}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {loadingStats ? (
                <div className="animate-pulse space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-20 bg-gray-100 rounded-lg"></div>
                    <div className="h-20 bg-gray-100 rounded-lg"></div>
                    <div className="h-20 bg-gray-100 rounded-lg"></div>
                  </div>
                </div>
              ) : stats ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.childrenCount}</p>
                      <p className="text-sm text-blue-600">ילדים</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.totalSessions}</p>
                      <p className="text-sm text-green-600">סשנים</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {stats.avgScore > 0 ? `${stats.avgScore.toFixed(0)}%` : '-'}
                      </p>
                      <p className="text-sm text-purple-600">ציון ממוצע</p>
                    </div>
                  </div>

                  {/* Last Activity */}
                  {stats.lastActivityDate && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500">פעילות אחרונה</p>
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatRelativeDay(stats.lastActivityDate)}
                      </p>
                    </div>
                  )}

                  {/* Per-Child Stats */}
                  {stats.perChildStats.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-3">סטטיסטיקות לפי ילד</h4>
                      <div className="space-y-3">
                        {stats.perChildStats.map((childStat) => (
                          <div
                            key={childStat.childId}
                            className="bg-white border border-gray-200 rounded-xl p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">{childStat.childName}</h5>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="flex items-center gap-1 text-yellow-600">
                                  <Star className="w-4 h-4" />
                                  {childStat.stars}
                                </span>
                                <span className="flex items-center gap-1 text-orange-600">
                                  <Flame className="w-4 h-4" />
                                  {childStat.streak}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">סשנים</p>
                                <p className="font-medium">{childStat.sessions}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">ציון ממוצע</p>
                                <p className="font-medium">
                                  {childStat.avgScore > 0 ? `${childStat.avgScore.toFixed(0)}%` : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>לא נמצאו נתונים</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Remove Parent Confirmation */}
        {removeConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">הסרת הורה</h3>
              <p className="text-gray-600 mb-6">
                האם להסיר את <strong>{removeConfirm.name}</strong> מהמשפחה?
                <br />
                <span className="text-sm text-gray-500">ההורה לא יוכל לגשת יותר לילדים</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setRemoveConfirm(null)}
                  disabled={isRemoving}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleRemoveParent}
                  disabled={isRemoving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isRemoving ? 'מסיר...' : 'כן, הסר'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
