import type { MailMessage, MailProvider, MailResult } from '../types';

/**
 * Resend over its REST API. No SDK: one endpoint does not justify a dependency,
 * and it keeps the Worker bundle small.
 *
 * Deliverability is not this adapter's job. SPF, DKIM and DMARC must be set on the
 * client's domain or the mail lands in spam regardless of the code — see the
 * project checklist.
 */
export function resendMail(apiKey: string, from: string): MailProvider {
  return {
    async send(message: MailMessage): Promise<MailResult> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(message.replyTo ? { reply_to: [message.replyTo] } : {}),
          }),
          signal: controller.signal,
        });

        if (response.ok) return { ok: true };

        return {
          ok: false,
          reason: response.status >= 500 ? 'unavailable' : 'rejected',
          detail: `HTTP ${response.status}`,
        };
      } catch (error) {
        return {
          ok: false,
          reason: 'unavailable',
          detail: controller.signal.aborted ? 'timeout' : (error as Error).message,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
