/**
 * Invite Manager - Create and manage invites
 *
 * Super admin can create invites for new users and manage existing ones.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Plus, ArrowLeft, Copy, Check, X, Trash2, Clock,
  CheckCircle, AlertCircle, Users
} from 'lucide-react';
import { Button } from '../components/Button';
import { useStore } from '../store';
import {
  getAllFamilies,
  subscribeToInvites,
  createInvite,
  revokeInvite,
  hasPendingInvite,
  getInviteUrl
} from '../services';
import { Family, Invite } from '../types';
import { formatRelativeDay, formatHebrewDate } from '../lib';

export const InviteManager: React.FC = () => {
  const navigate = useNavigate();
  const { parent, family } = useStore();

  const [families, setFamilies] = useState<Family[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create form state
  const [isCreating, setIsCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<Invite | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load families on mount
  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const familiesData = await getAllFamilies();
        setFamilies(familiesData);

        // Default to current user's family
        if (family) {
          setSelectedFamilyId(family.id);
        } else if (familiesData.length > 0) {
          setSelectedFamilyId(familiesData[0].id);
        }
      } catch (error) {
        console.error('Failed to load families:', error);
      }
    };

    loadFamilies();
  }, [family]);

  // Subscribe to invites
  useEffect(() => {
    const unsubscribe = subscribeToInvites(
      (invitesData) => {
        setInvites(invitesData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Failed to load invites:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsSubmitting(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        setCreateError('כתובת אימייל לא תקינה');
        setIsSubmitting(false);
        return;
      }

      // Check for existing pending invite
      const hasPending = await hasPendingInvite(newEmail);
      if (hasPending) {
        setCreateError('כבר קיימת הזמנה ממתינה לאימייל זה');
        setIsSubmitting(false);
        return;
      }

      // Get family name
      const selectedFamily = families.find(f => f.id === selectedFamilyId);
      if (!selectedFamily) {
        setCreateError('נא לבחור משפחה');
        setIsSubmitting(false);
        return;
      }

      // Create invite
      const invite = await createInvite(
        newEmail,
        selectedFamilyId,
        selectedFamily.name,
        parent!.id
      );

      setCreatedInvite(invite);
      setNewEmail('');

    } catch (error) {
      console.error('Failed to create invite:', error);
      setCreateError('שגיאה ביצירת ההזמנה. נסו שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('האם לבטל את ההזמנה הזו?')) return;

    try {
      await revokeInvite(inviteId);
    } catch (error) {
      console.error('Failed to revoke invite:', error);
    }
  };

  const handleCopyLink = async (invite: Invite) => {
    const url = getInviteUrl(invite.code);
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            <Clock size={12} />
            ממתין
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            <CheckCircle size={12} />
            נרשם
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            <AlertCircle size={12} />
            פג תוקף
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
            <X size={12} />
            בוטל
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="text-indigo-600" size={28} />
              ניהול הזמנות
            </h1>
            <p className="text-gray-500 text-sm">צרו הזמנות למשתמשים חדשים</p>
          </div>
        </div>

        {!isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2"
          >
            <Plus size={18} />
            הזמנה חדשה
          </Button>
        )}
      </div>

      {/* Create Invite Form */}
      {isCreating && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">יצירת הזמנה חדשה</h2>
            <button
              onClick={() => {
                setIsCreating(false);
                setCreatedInvite(null);
                setCreateError('');
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {createdInvite ? (
            /* Success View */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle size={20} />
                  <span className="font-medium">ההזמנה נוצרה בהצלחה!</span>
                </div>
                <p className="text-sm text-green-700">
                  שלחו את הקישור הבא ל-{createdInvite.email}:
                </p>
              </div>

              <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between gap-2">
                <code className="text-sm text-gray-700 break-all" dir="ltr">
                  {getInviteUrl(createdInvite.code)}
                </code>
                <button
                  onClick={() => handleCopyLink(createdInvite)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                >
                  {copiedId === createdInvite.id ? (
                    <Check size={18} className="text-green-600" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                ההזמנה תקפה ל-7 ימים
              </p>

              <Button
                onClick={() => {
                  setCreatedInvite(null);
                  setIsCreating(false);
                }}
                variant="secondary"
                className="w-full"
              >
                סיום
              </Button>
            </div>
          ) : (
            /* Create Form */
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל המוזמן
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="example@gmail.com"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  משפחה
                </label>
                <select
                  value={selectedFamilyId}
                  onChange={(e) => setSelectedFamilyId(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {createError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  צור הזמנה
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreating(false)}
                >
                  ביטול
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Invites List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">כל ההזמנות</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {invites.map((invite) => (
            <div key={invite.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
                  {getStatusBadge(invite.status)}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <Users size={12} />
                  <span>{invite.familyName}</span>
                  <span>•</span>
                  <span>נוצר {formatRelativeDay(invite.createdAt)}</span>
                  {invite.status === 'pending' && (
                    <>
                      <span>•</span>
                      <span>פג תוקף {formatHebrewDate(invite.expiresAt)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {invite.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleCopyLink(invite)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="העתק קישור"
                    >
                      {copiedId === invite.id ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} className="text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="בטל הזמנה"
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {invites.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Mail className="mx-auto mb-2" size={32} />
              <p>אין הזמנות עדיין</p>
              <p className="text-sm">צרו הזמנה חדשה כדי להוסיף משתמשים</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
