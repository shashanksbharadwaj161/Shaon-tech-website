import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BRIEF_FORMAT,
  DELIVERY_LINE,
  JSON_MIME,
  TEXT_MIME,
  briefFilename,
  buildBriefFile,
  buildBriefJson,
  buildBriefText,
  downloadFile,
  localIsoTimestamp,
} from './briefExport';
import { EMPTY_BRIEF, type BriefData } from './briefModel';

const CREATED = '2026-10-04T08:30:00+09:00';

const FULL: BriefData = {
  projectType: 'both',
  goals: 'Bookings in two languages.\r\nKeep the current colours.',
  currency: 'JPY',
  budgetRange: 'jpy-500000-1500000',
  timing: '1-3-months',
  name: '  山田 花子 ',
  email: ' hanako@example.jp ',
  company: 'Example Studio Co.',
};

/** Only the required answers: every optional one skipped. */
const MINIMAL: BriefData = {
  ...EMPTY_BRIEF,
  projectType: 'website',
  goals: 'A portfolio site.',
  currency: 'JPY', // switched, but no range chosen
  name: 'Aiko',
  email: 'aiko@example.com',
};

/** Exports describe a local copy, not a tracked online delivery result. */
const DELIVERY_CLAIM = /\b(submitted|delivered|received|on its way|we'?ll be in touch|thank you|sent to)\b/i;

describe('buildBriefJson', () => {
  it('round-trips through JSON.parse with exactly the agreed shape', () => {
    expect(JSON.parse(buildBriefJson(FULL, CREATED))).toEqual({
      format: 'shaon-tech-project-brief',
      version: 1,
      createdAt: CREATED,
      project: { type: 'both', typeLabel: 'Both', goals: 'Bookings in two languages.\nKeep the current colours.' },
      budget: { currency: 'JPY', range: 'jpy-500000-1500000', rangeLabel: '¥500,000–¥1,500,000' },
      timing: { value: '1-3-months', label: '1–3 months' },
      contact: { name: '山田 花子', email: 'hanako@example.jp', company: 'Example Studio Co.' },
      delivery: DELIVERY_LINE,
    });
  });

  it('writes null for every skipped optional answer, including the currency', () => {
    const parsed = JSON.parse(buildBriefJson(MINIMAL, CREATED));
    expect(parsed.budget).toEqual({ currency: null, range: null, rangeLabel: null });
    expect(parsed.timing).toEqual({ value: null, label: null });
    expect(parsed.contact.company).toBeNull();
  });

  it('keeps the currency for "Not sure" (it belongs to whichever list was shown)', () => {
    const parsed = JSON.parse(buildBriefJson({ ...MINIMAL, budgetRange: 'not-sure' }, CREATED));
    expect(parsed.budget).toEqual({ currency: 'JPY', range: 'not-sure', rangeLabel: 'Not sure' });
  });

  it('is pretty-printed with two spaces, top-level keys in a stable order', () => {
    const json = buildBriefJson(FULL, CREATED);
    expect(json.split('\n')[1]).toBe(`  "format": "${BRIEF_FORMAT}",`);
    expect(json.endsWith('}\n')).toBe(true);
    expect(Object.keys(JSON.parse(json))).toEqual([
      'format',
      'version',
      'createdAt',
      'project',
      'budget',
      'timing',
      'contact',
      'delivery',
    ]);
  });

  it('keeps non-ASCII characters literal rather than escaped', () => {
    const json = buildBriefJson(FULL, CREATED);
    expect(json).toContain('"name": "山田 花子"');
    expect(json).toContain('¥500,000–¥1,500,000');
    expect(json).not.toMatch(/\\u[0-9a-f]{4}/i);
  });
});

describe('buildBriefText', () => {
  const text = buildBriefText(FULL, CREATED);

  it('is readable with headings and labelled answers', () => {
    for (const expected of [
      'ShaOn Tech — project brief',
      'PROJECT & GOALS',
      'What do you need?: Both',
      'What should it achieve?',
      '  Bookings in two languages.',
      '  Keep the current colours.',
      'BUDGET & TIMING',
      'Budget currency: JPY',
      'Budget range: ¥500,000–¥1,500,000',
      'Timing: 1–3 months',
      'YOUR DETAILS',
      'Name: 山田 花子',
      'Email: hanako@example.jp',
      'Company: Example Studio Co.',
      `Delivery: ${DELIVERY_LINE}`,
    ]) {
      expect(text.split('\n')).toContain(expected);
    }
  });

  it('shows "Not provided" for skipped optional answers', () => {
    const minimal = buildBriefText(MINIMAL, CREATED).split('\n');
    expect(minimal).toContain('Budget currency: Not provided');
    expect(minimal).toContain('Budget range: Not provided');
    expect(minimal).toContain('Timing: Not provided');
    expect(minimal).toContain('Company: Not provided');
  });

  it('uses LF line endings only and ends with a newline', () => {
    expect(text).not.toContain('\r');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('survives a UTF-8 encode/decode round trip unchanged', () => {
    const bytes = new TextEncoder().encode(text);
    expect(new TextDecoder('utf-8', { fatal: true }).decode(bytes)).toBe(text);
    // "¥" is two bytes in UTF-8 (C2 A5), so the byte count exceeds the character count.
    expect(bytes.length).toBeGreaterThan([...text].length);
  });
});

describe('honesty: no output claims delivery', () => {
  it.each([
    ['JSON', buildBriefJson(FULL, CREATED)],
    ['text', buildBriefText(FULL, CREATED)],
    ['minimal JSON', buildBriefJson(MINIMAL, CREATED)],
    ['minimal text', buildBriefText(MINIMAL, CREATED)],
  ])('%s describes a local copy without claiming online delivery', (_label, output) => {
    expect(output).not.toMatch(DELIVERY_CLAIM);
    const mentions = output.match(/\bsent\b/gi) ?? [];
    expect(mentions).toHaveLength(0);
    expect(output).toContain('Local copy');
    expect(output).not.toContain('Not sent.');
  });

  it('the delivery field explicitly does not record online submission status', () => {
    expect(JSON.parse(buildBriefJson(FULL, CREATED)).delivery).toBe(DELIVERY_LINE);
    expect(DELIVERY_LINE).toContain('does not record online submission');
  });
});

describe('briefFilename', () => {
  it('names files shaon-tech-brief-YYYY-MM-DD with the right extension', () => {
    expect(briefFilename('json', CREATED)).toBe('shaon-tech-brief-2026-10-04.json');
    expect(briefFilename('txt', CREATED)).toBe('shaon-tech-brief-2026-10-04.txt');
  });

  it('uses the calendar date written in the timestamp, not the UTC date', () => {
    // 00:30 in Tokyo is still the previous day in UTC.
    expect(briefFilename('json', '2026-10-04T00:30:00+09:00')).toBe('shaon-tech-brief-2026-10-04.json');
    expect(briefFilename('txt', '2026-10-03T23:30:00-05:00')).toBe('shaon-tech-brief-2026-10-03.txt');
  });

  it('rejects something that is not a timestamp', () => {
    expect(() => briefFilename('json', 'yesterday')).toThrow(RangeError);
  });
});

describe('localIsoTimestamp', () => {
  const instant = new Date(Date.UTC(2026, 9, 3, 23, 30, 0));

  it('writes the local wall-clock time with its UTC offset', () => {
    expect(localIsoTimestamp(instant, 540)).toBe('2026-10-04T08:30:00+09:00');
    expect(localIsoTimestamp(instant, 0)).toBe('2026-10-03T23:30:00+00:00');
    expect(localIsoTimestamp(instant, -330)).toBe('2026-10-03T18:00:00-05:30');
    expect(localIsoTimestamp(instant, 345)).toBe('2026-10-04T05:15:00+05:45');
  });

  it('describes the same instant it was given', () => {
    for (const offset of [540, 0, -330, 345, -600]) {
      expect(new Date(localIsoTimestamp(instant, offset)).getTime()).toBe(instant.getTime());
    }
  });

  it('feeds a filename dated in the visitor’s own calendar', () => {
    expect(briefFilename('json', localIsoTimestamp(instant, 540))).toBe('shaon-tech-brief-2026-10-04.json');
    expect(briefFilename('json', localIsoTimestamp(instant, -300))).toBe('shaon-tech-brief-2026-10-03.json');
  });
});

describe('buildBriefFile', () => {
  it('pairs each format with its filename, content and UTF-8 MIME type', () => {
    expect(buildBriefFile('json', FULL, CREATED)).toEqual({
      filename: 'shaon-tech-brief-2026-10-04.json',
      content: buildBriefJson(FULL, CREATED),
      mime: 'application/json;charset=utf-8',
    });
    expect(buildBriefFile('txt', FULL, CREATED)).toMatchObject({
      filename: 'shaon-tech-brief-2026-10-04.txt',
      mime: 'text/plain;charset=utf-8',
    });
  });
});

describe('downloadFile', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** A stand-in for the few DOM pieces downloadFile touches — no DOM library needed. */
  function fakeDocument() {
    const link = { href: '', download: '', rel: '', hidden: false, click: vi.fn(), remove: vi.fn() };
    const append = vi.fn();
    vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { append } });
    return { link, append };
  }

  it('saves a UTF-8 Blob through a temporary link and revokes the URL afterwards', async () => {
    vi.useFakeTimers();
    const { link, append } = fakeDocument();
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:brief-test';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const content = buildBriefText(FULL, CREATED);
    downloadFile('shaon-tech-brief-2026-10-04.txt', content, TEXT_MIME);

    expect(link.download).toBe('shaon-tech-brief-2026-10-04.txt');
    expect(link.href).toBe('blob:brief-test');
    expect(append).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();

    expect(blob?.type).toBe('text/plain;charset=utf-8');
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect(bytes).toEqual(new TextEncoder().encode(content));

    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:brief-test');
  });

  it('still removes the link and revokes the URL if the click throws', () => {
    vi.useFakeTimers();
    const { link } = fakeDocument();
    link.click.mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:blocked');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    expect(() => downloadFile('brief.json', '{}', JSON_MIME)).toThrow('blocked');
    expect(link.remove).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:blocked');
  });
});
