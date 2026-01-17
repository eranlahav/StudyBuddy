/**
 * Admin Dashboard - Super Admin Overview
 *
 * Shows all families and system stats.
 * Only accessible to super admin.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Home, Mail, ArrowLeft, UserPlus, Pencil } from 'lucide-react';
import { Button } from '../components/Button';
import { FamilyEditModal } from '../components/FamilyEditModal';
import { getAllFamilies, getAllInvites } from '../services';
import { Family, Invite, ChildProfile } from '../types';
import { formatRelativeDay } from '../lib';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  // parent check is done by ProtectedRoute with requiresSuperAdmin

  const [families, setFamilies] = useState<Family[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit modal state
  const [editFamily, setEditFamily] = useState<Family | null>(null);
  const [familyChildren, setFamilyChildren] = useState<ChildProfile[]>([]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [familiesData, invitesData] = await Promise.all([
          getAllFamilies(),
          getAllInvites()
        ]);
        setFamilies(familiesData);
        setInvites(invitesData);
      } catch (error) {
        console.error('Failed to load admin data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate stats
  const pendingInvites = invites.filter(i => i.status === 'pending').length;
  const acceptedInvites = invites.filter(i => i.status === 'accepted').length;
  const totalParents = families.reduce((sum, f) => sum + f.parentIds.length, 0);

  // Open family edit modal
  const handleEditFamily = async (family: Family) => {
    try {
      // Fetch children for this family
      const childrenQuery = query(
        collection(db, 'children'),
        where('familyId', '==', family.id)
      );
      const childrenSnapshot = await getDocs(childrenQuery);
      const children = childrenSnapshot.docs.map(doc => doc.data() as ChildProfile);

      setFamilyChildren(children);
      setEditFamily(family);
    } catch (error) {
      console.error('Failed to load family children:', error);
    }
  };

  // Refresh data after edit
  const handleModalClose = () => {
    setEditFamily(null);
    setFamilyChildren([]);
  };

  const handleModalUpdate = async () => {
    // Refresh families list
    try {
      const familiesData = await getAllFamilies();
      setFamilies(familiesData);
    } catch (error) {
      console.error('Failed to refresh families:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/parent')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="text-indigo-600" size={28} />
              ניהול מערכת
            </h1>
            <p className="text-gray-500 text-sm">לוח בקרה למנהל ראשי</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Home className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{families.length}</p>
              <p className="text-sm text-gray-500">משפחות</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalParents}</p>
              <p className="text-sm text-gray-500">הורים</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Mail className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingInvites}</p>
              <p className="text-sm text-gray-500">הזמנות ממתינות</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <UserPlus className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{acceptedInvites}</p>
              <p className="text-sm text-gray-500">נרשמו בהזמנה</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invites Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Mail size={18} />
              הזמנות אחרונות
            </h2>
            <Button
              onClick={() => navigate('/admin/invites')}
              size="sm"
              variant="secondary"
            >
              ניהול הזמנות
            </Button>
          </div>

          <div className="divide-y divide-gray-100">
            {invites.slice(0, 5).map((invite) => (
              <div key={invite.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                  <p className="text-xs text-gray-500">
                    {invite.familyName} • {formatRelativeDay(invite.createdAt)}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  invite.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  invite.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  invite.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {invite.status === 'pending' ? 'ממתין' :
                   invite.status === 'accepted' ? 'נרשם' :
                   invite.status === 'expired' ? 'פג תוקף' : 'בוטל'}
                </span>
              </div>
            ))}

            {invites.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                אין הזמנות עדיין
              </div>
            )}
          </div>
        </div>

        {/* Families Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Home size={18} />
              משפחות
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {families.map((family) => (
              <div key={family.id} className="p-3 flex items-center justify-between group">
                <div>
                  <p className="text-sm font-medium text-gray-900">{family.name}</p>
                  <p className="text-xs text-gray-500">
                    {family.parentIds.length} הורים • נוצר {formatRelativeDay(family.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleEditFamily(family)}
                  className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="עריכה"
                >
                  <Pencil size={16} />
                </button>
              </div>
            ))}

            {families.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                אין משפחות עדיין
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Family Edit Modal */}
      {editFamily && (
        <FamilyEditModal
          family={editFamily}
          children={familyChildren}
          onClose={handleModalClose}
          onUpdate={handleModalUpdate}
        />
      )}
    </div>
  );
};
