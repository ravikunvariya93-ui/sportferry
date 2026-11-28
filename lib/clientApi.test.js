import { apiFetch, apiErrorMessage } from './clientApi';

describe('apiFetch', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('returns the parsed payload with the status', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ venues: [{ id: 'v1' }] }),
    }));

    const res = await apiFetch('/api/venues');
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data.venues).toHaveLength(1);
    expect(await res.json()).toEqual(res.data);
  });

  it('tolerates a body that is not JSON instead of throwing', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError('Unexpected token <'); },
    }));

    const res = await apiFetch('/api/venues');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(502);
    expect(res.data).toEqual({});
    expect(await res.json()).toEqual({});
  });

  it('parses the body only once', async () => {
    const json = jest.fn(async () => ({ ok: true }));
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json }));

    const res = await apiFetch('/api/venues');
    await res.json();
    await res.json();
    expect(json).toHaveBeenCalledTimes(1);
  });
});

describe('apiErrorMessage', () => {
  it('prefers the server message and falls back when there is none', () => {
    expect(apiErrorMessage({ message: 'Booking not found.' }, 'Could not load.')).toBe('Booking not found.');
    expect(apiErrorMessage({}, 'Could not load.')).toBe('Could not load.');
    expect(apiErrorMessage(null, 'Could not load.')).toBe('Could not load.');
    expect(apiErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
