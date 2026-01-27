# Phase 6: Parent Notes UI

**Goal:** Parents can add contextual observations during session review that inform the learning profile

**Requirements:** NOTES-01, NOTES-02, NOTES-03, NOTES-04, NOTES-05

## Context

The backend is ready:
- `processParentNoteSignal()` in `services/signalService.ts` (lines 544-633)
- `ParentNote` interface in `types.ts` (line 593)
- Categories: `guessed`, `struggled`, `skipped_step`, `misunderstood`, `other`

The UI needs to be built:
- **HistoryTab.tsx** - Shows session history, expands to show questions. This is where we add notes.
- Need a new **NotesTab.tsx** - To view note history per child.
- Need **NoteDialog.tsx** component - Modal for adding notes.

## Plans

### Plan 6.1: NoteDialog Component
**File:** `components/NoteDialog.tsx`

Create a modal dialog for adding parent notes:
- Props: `open`, `onClose`, `onSubmit`, `questionText`, `topic`, `isCorrect`
- Dropdown for category selection (Hebrew labels)
- RTL textarea for free-form note
- Submit and Cancel buttons
- Uses Tailwind for styling (match existing UI patterns)

Category labels (Hebrew):
- `guessed` → "ניחש/ה"
- `struggled` → "התקשה/התה"  
- `skipped_step` → "דילג/ה על שלב"
- `misunderstood` → "לא הבין/ה את השאלה"
- `other` → "אחר"

### Plan 6.2: Add Note Button to HistoryTab
**File:** `pages/ChildDetails/HistoryTab.tsx`

Modify `QuestionResult` component:
- Add "הוסף הערה" button (MessageSquare icon) next to each question
- On click, open NoteDialog
- Pass question context (questionText, topic, isCorrect)
- On submit, call new `addParentNote()` service function

Need to update props to include `childId`, `sessionId`, `questionIndex`, `topic`.

### Plan 6.3: Parent Notes Service
**File:** `services/parentNotesService.ts`

Create CRUD service for parent notes:
- `addParentNote(note: Omit<ParentNote, 'id'>)` - Save to Firestore, call `processParentNoteSignal()`
- `getChildNotes(childId: string)` - Fetch all notes for a child
- `deleteNote(noteId: string)` - Optional: allow removing notes

Firestore collection: `parentNotes` (or subcollection under children)

### Plan 6.4: NotesTab Component
**File:** `pages/ChildDetails/NotesTab.tsx`

Create tab to view note history:
- List all notes for the child, newest first
- Show: date, topic, question text snippet, category badge, note text
- Filter by category (optional dropdown)
- Empty state: "אין הערות עדיין"

### Plan 6.5: Wire NotesTab to ChildDetails
**File:** `pages/ChildDetails/index.tsx`

- Add "הערות" tab to tab navigation
- Import and render NotesTab
- Pass childId prop
- Fetch notes via useEffect or hook

## Execution Order

1. Plan 6.3 (service) - Backend first
2. Plan 6.1 (NoteDialog) - UI component
3. Plan 6.2 (HistoryTab button) - Wire up add flow
4. Plan 6.4 (NotesTab) - View flow
5. Plan 6.5 (ChildDetails integration) - Final wiring

## Success Criteria

From ROADMAP.md:
1. ✅ Parent can click "Add Note" button on any question in session review
2. ✅ Parent can select note category from dropdown
3. ✅ Parent can write free-form observation in Hebrew (RTL)
4. ✅ System processes note through `processParentNoteSignal` immediately
5. ✅ Parent can view complete note history in dedicated Notes tab

## Dependencies

- None (uses existing backend)

---
*Created: 2026-01-26*
