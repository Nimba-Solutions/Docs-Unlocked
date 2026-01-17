import React, { useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { NavigationSection } from '../types';
import { flattenNavigation } from '../utils/navigation';

interface NavigationLinksProps {
  navigation: NavigationSection[];
  currentPath: string;
  onNavigate: (path: string) => void;
  position?: 'top' | 'bottom';
}

export const NavigationLinks: React.FC<NavigationLinksProps> = ({ 
  navigation, 
  currentPath, 
  onNavigate,
  position = 'top'
}) => {
  const flatNav = useMemo(() => flattenNavigation(navigation), [navigation]);
  const currentIndex = flatNav.findIndex(item => item.path === currentPath);
  const prevPage = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const nextPage = currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;

  if (!prevPage && !nextPage) return null;

  const spacingClass = position === 'top' 
    ? 'mb-8 pb-8 border-b border-gray-200' 
    : 'mt-8 pt-8 border-t border-gray-200';

  return (
    <div className={`flex items-center justify-between ${spacingClass}`}>
      <div className="text-sm">
        {prevPage ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(prevPage.path);
            }}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>
              <span className="text-gray-500">Previous:</span> {prevPage.title}
            </span>
          </a>
        ) : (
          <div className="text-gray-400">← Previous</div>
        )}
      </div>
      <div className="text-sm">
        {nextPage ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(nextPage.path);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 group"
          >
            <span>
              <span className="text-gray-500">Next:</span> {nextPage.title}
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        ) : (
          <div className="text-gray-400">Next →</div>
        )}
      </div>
    </div>
  );
};
