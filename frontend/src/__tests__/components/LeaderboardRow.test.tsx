import React from 'react';
import { render, screen } from '../helpers/test-utils';
import { LeaderboardRow } from '../../components/LeaderboardRow';
import type { LeaderboardEntry } from '../../types/leaderboard';

const baseEntry: LeaderboardEntry = {
  id: '1',
  rank: 1,
  name: 'Alice',
  points: 100,
  maxPoints: 100,
  isCurrentUser: false,
};

describe('LeaderboardRow', () => {
  it('renders name and points', () => {
    render(<LeaderboardRow item={baseEntry} />);
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('shows (You) suffix when isCurrentUser', () => {
    render(
      <LeaderboardRow item={{ ...baseEntry, name: 'Me', isCurrentUser: true }} />
    );
    expect(screen.getByText(/Me \(You\)/)).toBeTruthy();
  });

  it('renders medal for rank 1', () => {
    render(<LeaderboardRow item={baseEntry} />);
    expect(screen.getByText('🥇')).toBeTruthy();
  });

  it('renders medal for ranks 2 and 3', () => {
    const { rerender } = render(
      <LeaderboardRow item={{ ...baseEntry, rank: 2 }} />
    );
    expect(screen.getByText('🥈')).toBeTruthy();
    rerender(<LeaderboardRow item={{ ...baseEntry, rank: 3 }} />);
    expect(screen.getByText('🥉')).toBeTruthy();
  });

  it('renders #N for rank > 3', () => {
    render(<LeaderboardRow item={{ ...baseEntry, rank: 5 }} />);
    expect(screen.getByText('#5')).toBeTruthy();
  });

  it('shows rank change up', () => {
    render(
      <LeaderboardRow item={{ ...baseEntry, rank: 2, rankChange: 1 }} />
    );
    expect(screen.getByText('▲1')).toBeTruthy();
  });

  it('shows rank change down', () => {
    render(
      <LeaderboardRow item={{ ...baseEntry, rank: 4, rankChange: -2 }} />
    );
    expect(screen.getByText('▼2')).toBeTruthy();
  });
});
