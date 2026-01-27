/**
 * Notes Tab - View parent observation notes for a child
 *
 * Displays all notes added by parents during session review,
 * with filtering by category and chronological ordering.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Filter, Trash2, AlertCircle } from 'lucide-react';
import { NotesTabProps } from './types';
import { ParentNote, ParentNoteCategory } from '../../types';
import { getChildNotes, deleteNote, CATEGORY_LABELS } from '../../services/parentNotesService';

/**
 * Category badge colors for visual distinction
 */
const CATEGORY_COLORS: Record<ParentNoteCategory, string> = {
  guessed: 'bg-yellow-100 text-yellow-700',
  struggled: 'bg-red-100 text-red-700',
  skipped_step: 'bg-orange-100 text-orange-700',
  misunderstood: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700'
};

export const NotesTab: React.FC<NotesTabProps> = ({ child }) => {
  const [notes, setNotes] = useState<ParentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ParentNoteCategory | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch notes on mount and when child changes
  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const childNotes = await getChildNotes(child.id);
        setNotes(childNotes);
      } catch (err) {
        console.error('Failed to fetch notes:', err);
        setError('שגיאה בטעינת ההערות');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [child.id]);

  // Filter notes by category
  const filteredNotes = filterCategory === 'all'
    ? notes
    : notes.filter(n => n.category === filterCategory);

  // Handle note deletion
  const handleDelete = async (noteId: string) => {
    if (!confirm('האם למחוק את ההערה?')) return;

    setDeletingId(noteId);
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 rounded-xl h-24" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12 text-red-500 flex flex-col items-center gap-2">
        <AlertCircle size={32} />
        <span>{error}</span>
      </div>
    );
  }

  // Empty state
  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 animate-fade-in">
        <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-lg">אין הערות עדיין</p>
        <p className="text-sm mt-2">
          הוספת הערות תתאפשר בעת צפייה בהיסטוריית התרגולים
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter dropdown */}
      <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200">
        <Filter size={18} className="text-gray-400" />
        <label className="text-sm text-gray-600">סינון לפי סוג:</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ParentNoteCategory | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="all">הכל ({notes.length})</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => {
            const count = notes.filter(n => n.category === value).length;
            return (
              <option key={value} value={value}>
                {label} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {filteredNotes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onDelete={() => handleDelete(note.id)}
            isDeleting={deletingId === note.id}
          />
        ))}
      </div>

      {/* Empty filter result */}
      {filteredNotes.length === 0 && notes.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          אין הערות מסוג זה
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---

interface NoteCardProps {
  note: ParentNote;
  onDelete: () => void;
  isDeleting: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, isDeleting }) => {
  const formattedDate = new Date(note.timestamp).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[note.category]}`}>
            {CATEGORY_LABELS[note.category]}
          </span>
          <span className="text-sm text-gray-500">נושא: {note.topic}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{formattedDate}</span>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="מחק הערה"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Note content */}
      <div className="p-4">
        <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
      </div>
    </div>
  );
};

export default NotesTab;
