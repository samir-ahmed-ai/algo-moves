import { Contrast, Gamepad2, Keyboard, Moon, Palette, Smartphone, Sun } from 'lucide-react';
import type { FeatureGroup } from '@/components/shared';

export const EXPLORE_GROUPS: FeatureGroup[] = [
  {
    options: [
      {
        id: 'swipe',
        icon: <Smartphone />,
        title: 'Swipe',
        subtitle: 'Mobile deck',
        tone: 'accent',
        detailTitle: 'Swipe Mode',
        detailDescription:
          'A swipeable card deck built for phone practice — flip through problems one-handed.',
      },
      {
        id: 'games',
        icon: <Gamepad2 />,
        title: 'Games',
        subtitle: 'Two-player rooms',
        tone: 'team1',
        detailTitle: 'Games',
        detailDescription: 'Race a friend through head-to-head algorithm rounds in a shared room.',
      },
      {
        id: 'vim',
        icon: <Keyboard />,
        title: 'Vim Dojo',
        subtitle: 'Keyboard drills',
        tone: 'team2',
        detailTitle: 'Vim Dojo',
        detailDescription:
          'Timed keyboard-mastery drills to build muscle memory for Vim motions and shortcuts.',
      },
    ],
  },
];

export const THEME_GROUPS: FeatureGroup[] = [
  {
    options: [
      {
        id: 'light',
        icon: <Sun />,
        title: 'Light',
        subtitle: 'Light background',
        detailTitle: 'Light Theme',
        detailDescription: 'Light background with dark text, ideal for bright environments.',
      },
      {
        id: 'dark',
        icon: <Moon />,
        title: 'Dark',
        subtitle: 'Dark background',
        detailTitle: 'Dark Theme',
        detailDescription: 'Dark background with light text, easy on the eyes in low light.',
      },
    ],
  },
];

export const PALETTE_GROUPS: FeatureGroup[] = [
  {
    options: [
      {
        id: 'default',
        icon: <Palette />,
        title: 'Default',
        subtitle: 'Standard',
        detailTitle: 'Default Palette',
        detailDescription: 'Standard accent colours used throughout the interface.',
      },
      {
        id: 'cb',
        icon: <Contrast />,
        title: 'CB-safe',
        subtitle: 'Accessible',
        detailTitle: 'Colour-blind Palette',
        detailBadge: 'A11Y',
        detailDescription:
          'Optimised for deuteranopia and protanopia — distinguishable without relying on red or green.',
      },
    ],
  },
];
