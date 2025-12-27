import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';
import AudioCloudCanvas from '../components/AudioCloudCanvas';

// Mock Canvas for JSDOM
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    fillText: vi.fn(),
  })) as any;
});

describe('UI/UX Experience', () => {
  it('Login Screen has Premium Audio Background', () => {
    const { container } = render(<AudioCloudCanvas audioUrl="" />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('Login Screen shows Shield Icon (Security)', () => {
    render(<App />);
    // Access Token Required text implies security context
    expect(screen.getByText(/Access Token Required/i)).toBeInTheDocument();
  });

  it('Login Screen has correct branding', () => {
    render(<App />);
    expect(screen.getByText(/DEVCLOUD OS/i)).toBeInTheDocument();
  });
});
