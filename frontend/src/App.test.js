import { render, screen, waitFor } from '@testing-library/react';
import Rooms from './Rooms';

/*
 * OP-03 / OP-02: when the API is down the room list must NOT invent rooms or
 * prices (the old fallback showed fixed tariffs that did not match the real
 * ones). It shows an error with a way to reach the hotel instead.
 */
describe('Rooms when the backend is unavailable', () => {
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

  test('shows an error and no made-up rooms or prices', async () => {
    render(
      <Rooms
        user={null}
        onBookClick={jest.fn()}
        onCardClick={jest.fn()}
        onAuthPrompt={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(
      await screen.findByText(/couldn't load room details/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/₹2,500/)).not.toBeInTheDocument();
  });
});
