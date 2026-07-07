import { Maximize2, Moon, Sun } from 'lucide-react';
import type { FeatureGroup } from '@/components/shared';

export const SURFACE_THEME_GROUPS: FeatureGroup[] = [
  {
    options: [
      {
        id: 'light',
        icon: <Sun />,
        title: 'Light',
        subtitle: 'Light background',
        detailTitle: 'Light Theme',
        detailDescription: 'Light background with dark text.',
      },
      {
        id: 'dark',
        icon: <Moon />,
        title: 'Dark',
        subtitle: 'Dark background',
        detailTitle: 'Dark Theme',
        detailDescription: 'Dark background with light text — easier on the eyes at night.',
      },
    ],
  },
];

export const SURFACE_VIEW_GROUPS: FeatureGroup[] = [
  {
    options: [
      {
        id: 'off',
        icon: <Maximize2 />,
        title: 'Normal',
        subtitle: 'Full chrome',
        detailTitle: 'Normal view',
        detailDescription: 'All UI chrome visible — toolbar, sidebar, and navigation.',
      },
      {
        id: 'on',
        icon: <Maximize2 />,
        title: 'Present',
        subtitle: 'Focus mode',
        detailTitle: 'Presentation mode',
        detailDescription: 'Hides chrome and maximises the problem surface for presenting or focusing.',
      },
    ],
  },
];
