import { Ionicons } from '@expo/vector-icons';

export type WebRouteId =
  | 'Dashboard'
  | 'Leaderboards'
  | 'Teams'
  | 'Members'
  | 'Rounds'
  | 'Analytics'
  | 'Settings';

export type WebNavItem = {
  id: WebRouteId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  adminOnly: boolean;
};

export const WEB_NAV_ITEMS: WebNavItem[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', adminOnly: false },
  { id: 'Leaderboards', label: 'Leaderboards', icon: 'podium-outline', adminOnly: false },
  { id: 'Teams', label: 'Teams', icon: 'people-outline', adminOnly: false },
  { id: 'Members', label: 'Manage Members', icon: 'person-outline', adminOnly: true },
  { id: 'Rounds', label: 'Challenges', icon: 'medal-outline', adminOnly: true },
  { id: 'Analytics', label: 'Analytics', icon: 'stats-chart-outline', adminOnly: true },
  { id: 'Settings', label: 'Settings', icon: 'settings-outline', adminOnly: true },
];
