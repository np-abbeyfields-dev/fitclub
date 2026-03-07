import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../../components/Button';

describe('Button', () => {
  it('renders title and calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Submit" onPress={onPress} />);
    const btn = screen.getByText('Submit');
    expect(btn).toBeTruthy();
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Submit" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Submit'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading state and hides title when loading', () => {
    render(<Button title="Submit" onPress={jest.fn()} loading />);
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('renders outline variant', () => {
    render(<Button title="Cancel" onPress={jest.fn()} variant="outline" />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });
});
