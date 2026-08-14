import { site } from "../../config/site.config";
import type { Lead } from "../adapters/types";
import type { MailMessage } from "../adapters/types";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export function leadAutoReply(lead: Lead): MailMessage {
  const name = lead.fields.name ?? "";
  const email = lead.fields.email ?? site.contact.email;
  return {
    to: email,
    subject: `Votre demande — ${site.name}`,
    replyTo: site.contact.email || undefined,
    html: `<p>Bonjour ${escapeHtml(name)},</p><p>Votre demande a bien été reçue. Nous reviendrons vers vous après lecture.</p><p>${escapeHtml(site.name)}</p>`,
    text: `Bonjour ${name},\n\nVotre demande a bien été reçue. Nous reviendrons vers vous après lecture.\n\n${site.name}`,
  };
}

export function leadNotification(lead: Lead): MailMessage {
  const lines = Object.entries(lead.fields)
    .map(([key, value]) => `<li><strong>${escapeHtml(key)}</strong> : ${escapeHtml(value)}</li>`)
    .join("");
  const name = lead.fields.name ?? "Demande";
  return {
    to: site.contact.email,
    subject: `Nouvelle demande — ${lead.fields.company ?? name}`,
    replyTo: lead.fields.email,
    html: `<h1>Nouvelle demande</h1><p><strong>${escapeHtml(name)}</strong></p><ul>${lines}</ul>`,
    text: `Nouvelle demande\n${name}\n${Object.entries(lead.fields).map(([key, value]) => `${key}: ${value}`).join("\n")}`,
  };
}
