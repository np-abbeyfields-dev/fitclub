import React from 'react';
import { render, screen, waitFor } from '../helpers/test-utils';
import LeaderboardScreen from '../../screens/LeaderboardScreen';
import { useClub } from '../../context/ClubContext';
import { clubService } from '../../services/clubService';
import { roundService } from '../../services/roundService';

jest.mock('../../context/ClubContext');
jest.mock('../../services/clubService');
jest.mock('../../services/roundService');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), getParent: () => ({ navigate: jest.fn() }) }),
  useFocusEffect: (fn: () => void) => fn(),
}));

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useClub as jest.Mock).mockReturnValue({ selectedClub: null });
  });

  it('renders empty state when no club selected', () => {
    render(<LeaderboardScreen />);
    expect(screen.getByText('Select a club to see the leaderboard.')).toBeTruthy();
  });

  it('shows no active round message when club has no active round', async () => {
    (useClub as jest.Mock).mockReturnValue({
      selectedClub: { id: 'c1', name: 'Club 1' },
    });
    (clubService.getDashboard as jest.Mock).mockResolvedValue({
      data: { activeRound: null },
    });
    render(<LeaderboardScreen />);
    expect(await screen.findByText('No active round for this club.')).toBeTruthy();
  });

  it('calls getDashboard and getLeaderboard when club has active round', async () => {
    (useClub as jest.Mock).mockReturnValue({
      selectedClub: { id: 'c1', name: 'Club 1' },
    });
    (clubService.getDashboard as jest.Mock).mockResolvedValue({
      data: {
        activeRound: { id: 'r1', name: 'Round 1', daysLeft: 7, endDate: '2025-04-01' },
      },
    });
    (roundService.getLeaderboard as jest.Mock)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });
    render(<LeaderboardScreen />);
    await waitFor(() => {
      expect(clubService.getDashboard).toHaveBeenCalledWith('c1');
      expect(roundService.getLeaderboard).toHaveBeenCalledWith('r1', 'individuals');
      expect(roundService.getLeaderboard).toHaveBeenCalledWith('r1', 'teams');
    });
  });
});
