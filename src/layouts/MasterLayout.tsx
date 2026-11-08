import React from 'react';
import { Outlet } from 'react-router-dom';
import { NavigationHeader } from '../components/NavigationHeader';

export const MasterLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f4ef] text-stone-800">
      <NavigationHeader />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};
