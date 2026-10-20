import { describe, expect, it } from 'vitest';
import { isApiOriginUrl } from './apiOrigin';

const API = 'https://api.loopcrm.app/api/v1';

describe('isApiOriginUrl', () => {
  it('accepts API URLs, including relative ones', () => {
    expect(isApiOriginUrl('https://api.loopcrm.app/api/v1/support-chat/admin/messages/3/attachment/', API)).toBe(true);
    expect(isApiOriginUrl('/api/v1/x/', '/api/v1', 'https://admin.loopcrm.app/telephony')).toBe(true);
  });

  it('rejects presigned object-storage URLs and other origins', () => {
    expect(
      isApiOriginUrl('https://acc0unt.r2.cloudflarestorage.com/loop-crm-media/backups/db.sqlite3?X-Amz-Signature=a', API),
    ).toBe(false);
    expect(isApiOriginUrl('http://api.loopcrm.app/api/v1/x', API)).toBe(false);
  });
});
