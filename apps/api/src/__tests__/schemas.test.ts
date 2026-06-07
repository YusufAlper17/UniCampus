import { describe, expect, it } from 'vitest';
import { createPostSchema, feedQuerySchema, sendOtpSchema } from '@unicampus/shared-types';

describe('paylaşılan şemalar', () => {
  it('feed sorgusu yalnızca social|career domain kabul eder', () => {
    expect(feedQuerySchema.safeParse({ domain: 'social' }).success).toBe(true);
    expect(feedQuerySchema.safeParse({ domain: 'career' }).success).toBe(true);
    expect(feedQuerySchema.safeParse({ domain: 'mixed' }).success).toBe(false);
  });

  it('post içeriği content_domain zorunlu kılar', () => {
    expect(createPostSchema.safeParse({ contentDomain: 'social', content: 'merhaba' }).success).toBe(
      true,
    );
    expect(createPostSchema.safeParse({ content: 'domainsiz' }).success).toBe(false);
  });

  it('post en fazla 4 medya ve 500 karakter', () => {
    const tooMany = createPostSchema.safeParse({
      contentDomain: 'social',
      mediaUrls: ['a', 'b', 'c', 'd', 'e'].map((s) => `https://x/${s}.jpg`),
    });
    expect(tooMany.success).toBe(false);
  });

  it('OTP gönderimi geçerli email + uuid ister', () => {
    expect(
      sendOtpSchema.safeParse({
        email: 'ali@itu.edu.tr',
        universityId: '00000000-0000-0000-0000-000000000000',
      }).success,
    ).toBe(true);
    expect(sendOtpSchema.safeParse({ email: 'bad', universityId: 'x' }).success).toBe(false);
  });
});
