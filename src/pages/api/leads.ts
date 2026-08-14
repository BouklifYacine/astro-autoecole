import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { resolveAdapters } from "../../lib/adapters";
import type { Lead } from "../../lib/adapters/types";
import { site } from "../../config/site.config";
import { getLeadConfig, hasLeadConfiguration } from "../../lib/leads/config";
import { acceptSubmission, releaseSubmission, reserveSubmission } from "../../lib/leads/idempotency";
import { consumeRateLimit } from "../../lib/leads/rate-limit";
import {
  getClientIp,
  hasMinimumDelay,
  isAllowedOrigin,
  readJsonBody,
} from "../../lib/leads/request";
import { leadError, leadSuccess } from "../../lib/leads/responses";
import { parseLeadRequest, toLeadFields } from "../../lib/leads/validation";
import type { RuntimeEnv } from "../../lib/leads/types";
import { leadAutoReply, leadNotification } from "../../lib/mail/templates";

// Astro 7 + @astrojs/cloudflare 14 no longer exposes bindings through
// Astro.locals.runtime.env. The current adapter exposes them through this module.
export const prerender = false;

function unavailable(): Response {
  return leadError(502, "SERVICE_UNAVAILABLE", "Le service de demandes est momentanément indisponible.");
}

export const POST: APIRoute = async ({ request }) => {
  const runtime = env as unknown as RuntimeEnv;
  const config = getLeadConfig(runtime);
  if (!hasLeadConfiguration(runtime)) return unavailable();

  if (!isAllowedOrigin(request.headers.get("Origin"), request.url, config.siteUrl)) {
    return leadError(403, "INVALID_ORIGIN", "Cette origine n’est pas autorisée.");
  }

  const body = await readJsonBody(request);
  if (body.kind === "invalid-content-type") return leadError(400, "INVALID_CONTENT_TYPE", "Le format de la demande est invalide.");
  if (body.kind === "payload-too-large") return leadError(413, "PAYLOAD_TOO_LARGE", "La demande est trop volumineuse.");
  if (body.kind === "invalid-json") return leadError(400, "INVALID_JSON", "Le contenu JSON est invalide.");

  const parsed = parseLeadRequest(body.value);
  if (!parsed.success) {
    return leadError(400, "INVALID_REQUEST", "Certains champs sont invalides.", { fieldErrors: parsed.fieldErrors });
  }

  const payload = parsed.data;
  if (payload.website) return leadError(400, "BOT_DETECTED", "La demande ne peut pas être traitée.");
  if (!hasMinimumDelay(payload.startedAt, site.form.minDelayMs)) {
    return leadError(400, "FORM_TOO_FAST", "La demande ne peut pas être traitée.");
  }

  const fields = toLeadFields(payload);
  const lead: Lead = {
    submissionId: payload.submissionId,
    receivedAt: new Date().toISOString(),
    fields,
    marketingOptIn: payload.marketingOptIn === true,
    legalBasis: site.form.legalBasis,
    ...(payload.utm ? { utm: payload.utm } : {}),
  };

  const adapters = resolveAdapters(runtime);
  if (!adapters.kv || !adapters.lead) return unavailable();

  const isDevelopment = import.meta.env.DEV;
  const ip = getClientIp(request, isDevelopment);
  if (!ip) return leadError(403, "INVALID_ORIGIN", "La vérification de sécurité a échoué.");

  const rateLimit = await consumeRateLimit({ ip, store: adapters.kv });
  if (rateLimit.kind === "unavailable") return unavailable();
  if (rateLimit.kind === "limited") {
    return leadError(429, "RATE_LIMITED", "Trop de tentatives. Réessayez dans quelques minutes.", {
      headers: { "Retry-After": rateLimit.retryAfterSeconds.toString() },
    });
  }

  if (adapters.captcha) {
    const captcha = await adapters.captcha.verify(payload.captchaToken ?? "", ip);
    if (captcha === "unavailable") return unavailable();
    if (captcha === "rejected") return leadError(403, "CAPTCHA_REJECTED", "La vérification de sécurité a échoué.");
  }

  const reservation = await reserveSubmission(payload.submissionId, adapters.kv);
  if (reservation === "unavailable") return unavailable();
  if (reservation === "accepted") return leadSuccess(config.bookingUrl ?? "/merci/");
  if (reservation === "processing") {
    return leadError(409, "DUPLICATE_SUBMISSION", "Cette demande est déjà en cours de traitement.");
  }

  const delivery = await adapters.lead.deliver(lead);
  if (!delivery.ok) {
    await releaseSubmission(payload.submissionId, adapters.kv);
    return leadError(delivery.reason === "timeout" ? 504 : 502, "DELIVERY_FAILED", "La demande n’a pas pu être transmise. Réessayez plus tard.");
  }

  if (adapters.mail) {
    if (fields.email && site.form.autoReply) await adapters.mail.send(leadAutoReply(lead));
    await adapters.mail.send(leadNotification(lead));
  }

  await acceptSubmission(payload.submissionId, adapters.kv);
  return leadSuccess(config.bookingUrl ?? "/merci/");
};
