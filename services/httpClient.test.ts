import { afterEach, describe, expect, it, vi } from 'vitest';
import { expireAdminSession, refreshTokensViaFetch } from './httpClient';

function installStorage() {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  return memory;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('refreshTokensViaFetch', () => {
  it('rotates once when several callers refresh together', async () => {
    const memory = installStorage();
    memory.set('refreshToken', 'old-refresh');
    memory.set('accessToken', 'old-access');

    let release: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn(() => pending);
    vi.stubGlobal('fetch', fetchMock);

    const first = refreshTokensViaFetch();
    const second = refreshTokensViaFetch();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release(
      new Response(JSON.stringify({ access: 'new-access', refresh: 'new-refresh' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(memory.get('accessToken')).toBe('new-access');
    expect(memory.get('refreshToken')).toBe('new-refresh');
  });

  it('leaves the stored refresh token in place when the refresh is rejected', async () => {
    const memory = installStorage();
    memory.set('refreshToken', 'still-good');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ detail: 'Token is blacklisted' }), { status: 401 }))
    );

    await expect(refreshTokensViaFetch()).rejects.toThrow(/blacklisted/i);
    expect(memory.get('refreshToken')).toBe('still-good');
  });
});

describe('expireAdminSession', () => {
  it('clears the session and redirects to login once', () => {
    const memory = installStorage();
    memory.set('accessToken', 'access');
    memory.set('refreshToken', 'refresh');
    memory.set('isAuthenticated', 'true');
    const replace = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/dashboard', replace } });

    expireAdminSession();
    expireAdminSession();

    expect(memory.get('accessToken')).toBeUndefined();
    expect(memory.get('refreshToken')).toBeUndefined();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/login');
  });
});
