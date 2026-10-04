/** Visitor-initiated FormSubmit delivery. No credentials, background sends or automatic retries. */
import { contact } from '../../content/site';
import { briefToExport } from './briefExport';
import { NOT_PROVIDED, hasErrors, validateStep, type BriefData } from './briefModel';

export const BRIEF_ENDPOINT = `https://formsubmit.co/ajax/${contact.email}`;
export type DeliveryResult = 'accepted' | 'activation-required';

/** Only known fields are posted; visitor values cannot add mail headers or change the recipient. */
export function buildBriefPayload(data: BriefData, createdAtISO: string, honey = ''): Record<string, string> {
  if (hasErrors(validateStep(1, data)) || hasErrors(validateStep(3, data))) {
    throw new Error('Complete the required project and contact answers before sending.');
  }
  const brief = briefToExport(data, createdAtISO);
  return {
    name: brief.contact.name,
    email: brief.contact.email,
    company: brief.contact.company ?? NOT_PROVIDED,
    project: brief.project.typeLabel ?? NOT_PROVIDED,
    goals: brief.project.goals,
    budget: brief.budget.rangeLabel ?? NOT_PROVIDED,
    currency: brief.budget.currency ?? NOT_PROVIDED,
    timing: brief.timing.label ?? NOT_PROVIDED,
    created: brief.createdAt,
    _subject: 'ShaOn Tech — new project brief',
    _template: 'table',
    _honey: honey,
  };
}

/** Fail closed on HTTP errors, malformed responses and an unconfirmed service result. */
export async function sendBrief(
  data: BriefData,
  createdAtISO: string,
  signal: AbortSignal,
  honey = '',
  request: typeof fetch = fetch,
): Promise<DeliveryResult> {
  const payload = buildBriefPayload(data, createdAtISO, honey);
  if (honey !== '') throw new Error('Unable to confirm submission.');
  const response = await request(BRIEF_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'omit',
    signal,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to confirm submission.');
  const result: unknown = await response.json();
  if (result === null || typeof result !== 'object') throw new Error('Unable to confirm submission.');
  const { success, message } = result as { success?: unknown; message?: unknown };
  // An activation response must never masquerade as delivered mail, even if success is true.
  if (typeof message === 'string' && /activat|confirm (?:your |the )?email|verif(?:y|ication)/i.test(message)) {
    return 'activation-required';
  }
  if (success !== true && success !== 'true') throw new Error('Unable to confirm submission.');
  return 'accepted';
}
