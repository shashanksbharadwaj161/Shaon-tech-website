import { describe, expect, it, vi } from 'vitest';
import { BRIEF_ENDPOINT, buildBriefPayload, sendBrief } from './briefDelivery';
import { EMPTY_BRIEF, type BriefData } from './briefModel';

const CREATED = '2026-10-04T08:30:00+09:00';
const valid = (overrides: Partial<BriefData> = {}): BriefData => ({
  ...EMPTY_BRIEF, projectType: 'website', goals: 'A portfolio.\r\n日本 🌀 + & # %?', name: ' Aiko ', email: ' aiko@example.com ', ...overrides,
});
const signal = () => new AbortController().signal;
const responds = (body: unknown, status = 200) => vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('brief delivery', () => {
  it('never posts incomplete or invalid answers', async () => {
    const request = responds({ success: true });
    await expect(sendBrief(EMPTY_BRIEF, CREATED, signal(), '', request)).rejects.toThrow(/required/);
    await expect(sendBrief(valid({ email: 'invalid' }), CREATED, signal(), '', request)).rejects.toThrow(/required/);
    await expect(sendBrief(valid({ goals: 'a'.repeat(2001) }), CREATED, signal(), '', request)).rejects.toThrow(/required/);
    expect(request).not.toHaveBeenCalled();
  });

  it('posts once to the fixed recipient with all answers, Unicode and no secret/captcha override', async () => {
    const request = responds({ success: 'true', message: 'Form successfully submitted' });
    const abortSignal = signal();
    await expect(sendBrief(valid(), CREATED, abortSignal, '', request)).resolves.toBe('accepted');
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('https://formsubmit.co/ajax/mediashaon@gmail.com');
    expect(url).toBe(BRIEF_ENDPOINT);
    expect(options?.signal).toBe(abortSignal);
    expect(options?.credentials).toBe('omit');
    const payload = JSON.parse(options?.body as string);
    expect(payload.goals).toBe('A portfolio.\n日本 🌀 + & # %?');
    expect(payload.name).toBe('Aiko');
    expect(payload.email).toBe('aiko@example.com');
    expect(payload.budget).toBe('Not provided');
    expect(payload.currency).toBe('Not provided');
    expect(payload).not.toHaveProperty('_captcha');
    expect(payload).not.toHaveProperty('_cc');
    expect(payload).not.toHaveProperty('delivery');
  });

  it('preserves optional budget, timing and all long answers instead of truncating', () => {
    const payload = buildBriefPayload(valid({ goals: '🌀'.repeat(2000), currency: 'JPY', budgetRange: 'jpy-500000-1500000', timing: '1-3-months', company: 'Example' }), CREATED);
    expect(payload.goals).toBe('🌀'.repeat(2000));
    expect(payload.budget).toBe('¥500,000–¥1,500,000');
    expect(payload.currency).toBe('JPY');
    expect(payload.timing).toBe('1–3 months');
    expect(payload.company).toBe('Example');
  });

  it.each([true, 'true'])('separates provider acceptance from inbox confirmation (%s)', async (success) => {
    await expect(sendBrief(valid(), CREATED, signal(), '', responds({ success }))).resolves.toBe('accepted');
    await expect(sendBrief(valid(), CREATED, signal(), '', responds({ success, message: 'Please activate your form. Check your email.' }))).resolves.toBe('activation-required');
  });

  it.each([{ success: false }, { success: 'false' }, {}, null, '<html>error</html>'])('rejects an unconfirmed service result', async (body) => {
    await expect(sendBrief(valid(), CREATED, signal(), '', responds(body))).rejects.toThrow(/confirm/);
  });

  it('rejects HTTP, invalid JSON and network errors without retrying', async () => {
    const http = responds({ success: true }, 503);
    await expect(sendBrief(valid(), CREATED, signal(), '', http)).rejects.toThrow(/confirm/);
    expect(http).toHaveBeenCalledTimes(1);
    const html = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>Captcha required</html>'));
    await expect(sendBrief(valid(), CREATED, signal(), '', html)).rejects.toThrow();
    const network = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Network failed'));
    await expect(sendBrief(valid(), CREATED, signal(), '', network)).rejects.toThrow();
    expect(network).toHaveBeenCalledTimes(1);
  });

  it('does not silently accept a honeypot submission', async () => {
    const request = responds({ success: true });
    await expect(sendBrief(valid(), CREATED, signal(), 'bot', request)).rejects.toThrow(/confirm/);
    expect(request).not.toHaveBeenCalled();
  });
});
