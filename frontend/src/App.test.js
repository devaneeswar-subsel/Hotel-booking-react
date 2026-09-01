import { render, screen, waitFor } from '@testing-library/react';
import Rooms from './Rooms';

describe('Rooms fallback behavior', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'fetch', {
      writable: true,
      value: jest.fn().mockRejectedValue(new Error('backend down')),
    });

    Object.defineProperty(window, 'fetch', {
      writable: true,
      value: global.fetch,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders a fallback catalog when the backend is unavailable', async () => {
    render(
      <Rooms
        user={null}
        onBookClick={jest.fn()}
        onCardClick={jest.fn()}
        onAuthPrompt={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Standard AC Room/i).length).toBeGreaterThan(1);
    });

    expect(screen.getByText(/₹2,500/i)).toBeInTheDocument();
  });
});
