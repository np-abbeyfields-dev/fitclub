import React from 'react';
import { render, screen } from '../helpers/test-utils';
import { RankBadge } from '../../components/RankBadge';

describe('RankBadge', () => {
  it('renders default label and rank', () => {
    render(<RankBadge rank={1} />);
    expect(screen.getByText('Team Rank')).toBeTruthy();
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByText('🥇')).toBeTruthy();
  });

  it('renders custom label', () => {
    render(<RankBadge rank={2} label="Your Rank" />);
    expect(screen.getByText('Your Rank')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
  });

  it('renders medal for top 3', () => {
    const { rerender } = render(<RankBadge rank={2} />);
    expect(screen.getByText('🥈')).toBeTruthy();
    rerender(<RankBadge rank={3} />);
    expect(screen.getByText('🥉')).toBeTruthy();
  });

  it('renders #N without medal for rank > 3', () => {
    render(<RankBadge rank={5} />);
    expect(screen.getByText('#5')).toBeTruthy();
    expect(screen.queryByText('🥇')).toBeNull();
    expect(screen.queryByText('🥈')).toBeNull();
    expect(screen.queryByText('🥉')).toBeNull();
  });
});
