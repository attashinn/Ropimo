'use client';

import * as React from 'react';
import { Home, FileText, Settings, Users, LayoutGrid } from 'lucide-react';
import { SidebarWithTabs, NavItem } from '@/components/ui/sidebar-with-chrome-like-tabs';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'projects', label: 'Projects', icon: LayoutGrid },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function DashboardContent() {
  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-stone-800 dark:text-stone-100'>
        Dashboard
      </h1>
      <p className='text-stone-500 dark:text-stone-400 mt-1'>
        Welcome to your dashboard
      </p>
    </div>
  );
}

function DocumentsContent() {
  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-stone-800 dark:text-stone-100'>
        Documents
      </h1>
      <p className='text-stone-500 dark:text-stone-400 mt-1'>
        Manage your documents
      </p>
    </div>
  );
}

function TeamContent() {
  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-stone-800 dark:text-stone-100'>
        Team
      </h1>
      <p className='text-stone-500 dark:text-stone-400 mt-1'>
        Manage your team members
      </p>
    </div>
  );
}

function ProjectsContent() {
  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-stone-800 dark:text-stone-100'>
        Projects
      </h1>
      <p className='text-stone-500 dark:text-stone-400 mt-1'>
        Manage your projects
      </p>
    </div>
  );
}

function SettingsContent() {
  return (
    <div className='p-6'>
      <h1 className='text-xl font-semibold text-stone-800 dark:text-stone-100'>
        Settings
      </h1>
      <p className='text-stone-500 dark:text-stone-400 mt-1'>
        Manage your settings
      </p>
    </div>
  );
}

const contentMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardContent />,
  documents: <DocumentsContent />,
  team: <TeamContent />,
  projects: <ProjectsContent />,
  settings: <SettingsContent />,
};

export default function HomePage() {
  const renderContent = (navId: string) => {
    return contentMap[navId] || <DashboardContent />;
  };

  return (
    <SidebarWithTabs
      companyName='Acme Inc'
      navItems={navItems}
      renderContent={renderContent}
      defaultNavId='dashboard'
      footer={
        <div className='flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent w-full'>
          <Avatar>
            <AvatarImage
              src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              alt='User Avatar'
              className='object-cover'
            />
            <AvatarFallback>UA</AvatarFallback>
          </Avatar>
          <div className='min-w-0 flex-1 overflow-hidden'>
            <p className='text-xs font-medium text-sidebar-foreground truncate whitespace-nowrap'>
              User Account
            </p>
            <p className='text-[10px] text-muted-foreground truncate whitespace-nowrap'>
              Pro Plan
            </p>
          </div>
        </div>
      }
    />
  );
}
export { HomePage as ChromeTabsSidebarDemo };
