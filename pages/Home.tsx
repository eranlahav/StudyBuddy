import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, Star } from 'lucide-react';
import { Button } from '../components/Button';

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl mb-4">
          <span className="block xl:inline">ללמוד בכיף</span>{' '}
          <span className="block text-indigo-600 xl:inline">עם כל המשפחה</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          "לומדים בבית" משתמש בבינה מלאכותית ליצירת תרגילי למידה מותאמים אישית לילדים שלכם. עקבו אחר ההתקדמות וחגגו הצלחות!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mt-4">
        {/* Child Entry */}
        <div className="bg-gradient-to-b from-indigo-50 to-white p-8 rounded-2xl shadow-xl border border-indigo-100 flex flex-col items-center hover:scale-105 transition-transform duration-300 group cursor-pointer" onClick={() => navigate('/child')}>
          <div className="bg-indigo-100 p-4 rounded-full mb-6 group-hover:bg-indigo-200 transition-colors">
            <Star className="h-12 w-12 text-indigo-600 animate-bounce-slow" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">לילדים</h2>
          <p className="text-gray-600 mb-6 text-sm">התחילו לתרגל, צברו כוכבים ולימדו דברים חדשים!</p>
          <Button 
            variant="fun" 
            size="lg" 
            className="w-full shadow-indigo-200"
            onClick={(e) => { e.stopPropagation(); navigate('/child'); }}
          >
            בואו נתחיל! 🚀
          </Button>
        </div>

        {/* Parent Entry */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center hover:shadow-xl transition-all duration-300 group cursor-pointer" onClick={() => navigate('/parent')}>
          <div className="bg-gray-100 p-4 rounded-full mb-6 group-hover:bg-gray-200 transition-colors">
            <ShieldCheck className="h-12 w-12 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">להורים</h2>
          <p className="text-gray-600 mb-6 text-sm">ניהול פרופילים, מקצועות, דוחות התקדמות והגדרות.</p>
          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full"
            onClick={(e) => { e.stopPropagation(); navigate('/parent'); }}
          >
            לוח בקרה
          </Button>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm">
            <Users size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">תמיכה במשפחה</h3>
          <p className="mt-2 text-base text-gray-500">מעקב אישי לכל ילד בנפרד.</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">בינה מלאכותית</h3>
          <p className="mt-2 text-base text-gray-500">שאלות חדשות בכל פעם, מותאמות בדיוק לרמה.</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
             </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">רמה מותאמת</h3>
          <p className="mt-2 text-base text-gray-500">רמת הקושי משתנה בהתאם להצלחה.</p>
        </div>
      </div>
    </div>
  );
};