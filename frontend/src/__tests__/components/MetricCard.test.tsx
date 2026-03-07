import React from 'react';
import { render, screen } from '../helpers/test-utils';
import { MetricCard } from '../../components/MetricCard';

describe('MetricCard', () => {
  it('renders value and label', () => {
    render(<MetricCard value={42} label="Workouts" />);
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('Workouts')).toBeTruthy();
  });

  it('formats number with locale string', () => {
    render(<MetricCard value={1000} label="Points" />);
    expect(screen.getByText('1,000')).toBeTruthy();
  });

  it('renders string value as-is', () => {
    render(<MetricCard value="--" label="Streak" />);
    expect(screen.getByText('--')).toBeTruthy();
  });

  it('renders with accent without crashing', () => {
    render(
      <MetricCard value={5} label="Streak" accent="success" />
    );
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('Streak')).toBeTruthy();
  });
});
