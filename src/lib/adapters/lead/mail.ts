import { MAIL_NOTIFY_TO } from 'astro:env/server';

import { site } from '@/config/site.config';
import type { DeliveryResult, Lead, LeadDestination, MailProvider } from '../types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Delivers the lead as an email instead of a webhook — the fallback for a client
 * with no automation stack.
 *
 * Values are escaped before they enter the HTML body: a lead is untrusted input,
 * and it lands in a mailbox that renders HTML.
 */
export function mailDestination(mail: MailProvider): LeadDestination {
  return {
    async deliver(lead: Lead): Promise<DeliveryResult> {
      const to = MAIL_NOTIFY_TO?.trim() || site.contact.email;
      if (!to) return { ok: false, reason: 'unconfigured', detail: 'MAIL_NOTIFY_TO' };

      const rows = Object.entries(lead.fields)
        .map(([key, value]) => `<tr><th align="left">${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`)
        .join('');

      const plain = Object.entries(lead.fields)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      const result = await mail.send({
        to,
        subject: `Nouvelle demande — ${site.name}`,
        html: `<table>${rows}</table><p>Reçu le ${lead.receivedAt}</p>`,
        text: `${plain}\n\nReçu le ${lead.receivedAt}`,
        replyTo: lead.fields.email,
      });

      return result.ok ? { ok: true } : { ok: false, reason: result.reason, detail: result.detail };
    },
  };
}
