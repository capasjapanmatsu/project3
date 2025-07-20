// ViewTabs.tsx - ビュー切り替えタブコンポーネント
import { Grid, List, Map } from 'lucide-react';
import { ReactNode } from 'react';

export type ViewMode = 'grid' | 'list' | 'map';

interface ViewTab {
  id: ViewMode;
  label: string;
  icon: ReactNode;
}

interface ViewTabsProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

const VIEW_TABS: ViewTab[] = [
  {
    id: 'grid',
    label: 'カード表示',
    icon: <Grid className="w-4 h-4" />
  },
  {
    id: 'list',
    label: 'リスト表示',
    icon: <List className="w-4 h-4" />
  },
  {
    id: 'map',
    label: 'マップ表示',
    icon: <Map className="w-4 h-4" />
  }
];

export function ViewTabs({ currentView, onViewChange, className = '' }: ViewTabsProps) {
  return (
    <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
      {VIEW_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onViewChange(tab.id)}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
            transition-all duration-200 flex-1 justify-center
            ${currentView === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }
          `}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ViewTabs;
