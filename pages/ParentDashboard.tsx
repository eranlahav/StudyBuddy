
import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, ArrowRight, Activity, Calendar, BookOpen, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../components/Button';

export const ParentDashboard: React.FC = () => {
  const { children, sessions, upcomingTests, subjects, addSubject, removeSubject } = useStore();
  const navigate = useNavigate();
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectIcon, setNewSubjectIcon] = useState('📚');
  const [newSubjectColor, setNewSubjectColor] = useState('bg-indigo-500');

  const getChildStats = (childId: string) => {
    const childSessions = sessions.filter(s => s.childId === childId);
    const totalSessions = childSessions.length;
    const avgScore = totalSessions > 0 
      ? Math.round(childSessions.reduce((acc, s) => acc + (s.score / s.totalQuestions) * 100, 0) / totalSessions) 
      : 0;
    
    // Check upcoming tests
    const nextTest = (upcomingTests || [])
      .filter(t => t.childId === childId)
      .sort((a, b) => a.date - b.date)[0];

    return { totalSessions, avgScore, nextTest };
  };

  const chartData = children.map(child => {
    const { avgScore } = getChildStats(child.id);
    return {
      name: child.name,
      score: avgScore,
      fill: '#6366f1' // Indigo
    };
  });

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName) return;
    
    addSubject({
      id: crypto.randomUUID(),
      name: newSubjectName,
      icon: newSubjectIcon,
      color: newSubjectColor,
      topics: [] // Starts empty
    });

    setNewSubjectName('');
    setShowSubjectModal(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">לוח בקרה להורים</h1>
          <p className="text-gray-500 mt-2">לחצו על פרופיל ילד לצפייה בפרטים מלאים, תוכנית לימודים וניתוח ביצועים.</p>
        </div>
        <Button onClick={() => setShowSubjectModal(true)} variant="secondary">
           <BookOpen size={18} className="ml-2" /> ניהול מקצועות
        </Button>
      </div>

      {/* Children Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {children.map(child => {
          const stats = getChildStats(child.id);
          return (
            <div 
              key={child.id} 
              onClick={() => navigate(`/parent/child/${child.id}`)}
              className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group"
            >
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 text-4xl ml-4 bg-slate-50 p-2 rounded-full">{child.avatar}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{child.name}</h3>
                      <p className="text-sm text-gray-500">{child.grade}</p>
                    </div>
                  </div>
                  <ArrowRight className="text-gray-300 group-hover:text-indigo-500 transform group-hover:-translate-x-1 transition-all" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {child.subjects.map(sid => {
                     const s = subjects.find(sub => sub.id === sid);
                     return s ? <span key={sid} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1">{s.icon} {s.name}</span> : null
                  })}
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                       <Activity size={16} /> ממוצע ציונים
                    </span>
                    <span className={`font-bold ${stats.avgScore >= 80 ? 'text-green-600' : stats.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {stats.avgScore}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                       <Calendar size={16} /> מבחן קרוב
                    </span>
                    <span className="font-medium text-gray-900">
                      {stats.nextTest 
                        ? new Date(stats.nextTest.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
                        : 'אין'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" />
                  {child.stars} כוכבים
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">סקירה כללית</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} unit="%" orientation="right" />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', direction: 'rtl' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#10b981' : entry.score > 50 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">פעילות אחרונה בכל הבית</h2>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {sessions.slice(0, 5).map((session) => {
                const child = children.find(c => c.id === session.childId);
                const date = new Date(session.date).toLocaleDateString('he-IL');
                return (
                  <li key={session.id} className="py-4">
                    <div className="flex items-center space-x-4 space-x-reverse">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">{child?.avatar}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {child?.name} תרגל {session.topic}
                        </p>
                        <p className="text-sm text-gray-500">
                          {date} • ציון: {session.score}/{session.totalQuestions}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (session.score / session.totalQuestions) >= 0.8 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {Math.round((session.score / session.totalQuestions) * 100)}%
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
              {sessions.length === 0 && (
                <li className="py-4 text-center text-gray-500 italic">אין עדיין פעילות.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Subject Management Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">ניהול מקצועות לימוד</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {/* Existing Subjects List */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">מקצועות קיימים</h4>
                {subjects.map(sub => (
                   <div key={sub.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-indigo-100 hover:shadow-sm transition-all group">
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-lg ${sub.color} flex items-center justify-center text-xl text-white`}>
                         {sub.icon}
                       </div>
                       <span className="font-medium text-gray-700">{sub.name}</span>
                     </div>
                     <button 
                       onClick={() => {
                         if(confirm('למחוק את המקצוע? זה לא ימחק היסטוריה אבל יסיר אותו מהרשימה.')) {
                           removeSubject(sub.id);
                         }
                       }}
                       className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                ))}
              </div>

              <hr className="border-gray-100" />

              {/* Add New Subject Form */}
              <form onSubmit={handleAddSubject} className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                 <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Plus size={16} /> הוסף מקצוע חדש
                 </h4>
                 
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">שם המקצוע</label>
                   <input 
                     type="text" 
                     required
                     placeholder="לדוגמה: רובוטיקה"
                     value={newSubjectName}
                     onChange={e => setNewSubjectName(e.target.value)}
                     className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">אייקון (אימוג'י)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="🤖"
                        value={newSubjectIcon}
                        onChange={e => setNewSubjectIcon(e.target.value)}
                        className="w-full rounded-lg border-gray-300 p-2 text-center text-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">צבע רקע</label>
                      <select 
                        value={newSubjectColor}
                        onChange={e => setNewSubjectColor(e.target.value)}
                        className="w-full rounded-lg border-gray-300 p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                      >
                        <option value="bg-red-500">אדום</option>
                        <option value="bg-blue-500">כחול</option>
                        <option value="bg-green-500">ירוק</option>
                        <option value="bg-yellow-500">צהוב</option>
                        <option value="bg-purple-500">סגול</option>
                        <option value="bg-pink-500">ורוד</option>
                        <option value="bg-indigo-500">אינדיגו</option>
                        <option value="bg-orange-500">כתום</option>
                        <option value="bg-teal-500">טורקיז</option>
                        <option value="bg-slate-500">אפור</option>
                      </select>
                    </div>
                 </div>
                 
                 <Button type="submit" size="sm" className="w-full">הוסף מקצוע</Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
