import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Input } from '../../components/Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('calls onChangeText when typing', () => {
    const onChange = jest.fn();
    render(<Input placeholder="Name" onChangeText={onChange} />);
    fireEvent.changeText(screen.getByPlaceholderText('Name'), 'Test');
    expect(onChange).toHaveBeenCalledWith('Test');
  });

  it('displays value when controlled', () => {
    render(<Input placeholder="Email" value="user@test.com" />);
    expect(screen.getByDisplayValue('user@test.com')).toBeTruthy();
  });
});
