import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('System Integrity', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Should see the text "DevCloud OS" from the LoginScreen
    expect(screen.getByText(/DevCloud OS/i)).toBeInTheDocument();
  });

  it('shows login screen by default', () => {
    render(<App />);
    expect(screen.getByText(/Access Token Required/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
  });
});
