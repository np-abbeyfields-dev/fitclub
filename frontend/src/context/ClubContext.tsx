import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { clubService, type ClubWithRole } from '../services/clubService';

const SELECTED_CLUB_ID_KEY = 'fitclub_selected_club_id';

type ClubContextValue = {
  clubs: ClubWithRole[];
  selectedClub: ClubWithRole | null;
  setSelectedClub: (club: ClubWithRole | null) => void;
  refreshClubs: () => Promise<void>;
  /** Role from ClubMembership; never from User. */
  role: 'admin' | 'team_lead' | 'member' | null;
  isAdmin: boolean;
  isTeamLead: boolean;
  /** Can add/remove team members: admin or team_lead. */
  canManageTeam: boolean;
  isLoading: boolean;
};

const ClubContext = createContext<ClubContextValue | null>(null);

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [clubs, setClubs] = useState<ClubWithRole[]>([]);
  const [selectedClub, setSelectedClubState] = useState<ClubWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshClubs = useCallback(async () => {
    if (!isAuthenticated) {
      setClubs([]);
      setSelectedClubState(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await clubService.listMine();
      const list = res.data || [];
      setClubs(list);
      let nextSelected: ClubWithRole | null = null;
      if (list.length === 0) {
        await AsyncStorage.removeItem(SELECTED_CLUB_ID_KEY).catch(() => {});
      } else {
        const savedId = await AsyncStorage.getItem(SELECTED_CLUB_ID_KEY).catch(() => null);
        const found = savedId ? list.find((c) => c.id === savedId) : null;
        if (found) nextSelected = found;
        else nextSelected = list[0];
        await AsyncStorage.setItem(SELECTED_CLUB_ID_KEY, nextSelected.id).catch(() => {});
      }
      setSelectedClubState(nextSelected);
    } catch {
      setClubs([]);
      setSelectedClubState(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshClubs();
  }, [refreshClubs]);

  const setSelectedClub = useCallback((club: ClubWithRole | null) => {
    setSelectedClubState(club);
    if (club) {
      AsyncStorage.setItem(SELECTED_CLUB_ID_KEY, club.id).catch(() => {});
    } else {
      AsyncStorage.removeItem(SELECTED_CLUB_ID_KEY).catch(() => {});
    }
  }, []);

  const value: ClubContextValue = {
    clubs,
    selectedClub,
    setSelectedClub,
    refreshClubs,
    role: selectedClub?.role ?? null,
    isAdmin: selectedClub?.role === 'admin',
    isTeamLead: selectedClub?.role === 'team_lead',
    canManageTeam: selectedClub?.role === 'admin' || selectedClub?.role === 'team_lead',
    isLoading,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within ClubProvider');
  return ctx;
}
