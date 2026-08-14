import type { FormField } from '@/config/schema';

export type ContactFieldValue = string | boolean;

export type ContactFormValues = Record<string, ContactFieldValue> & {
  website: string;
  acknowledgement: boolean;
  marketingOptIn: boolean;
};

export type ContactSubmissionPayload = {
  submissionId: string;
  startedAt: number;
  website: string;
  captchaToken?: string;
  acknowledgement?: boolean;
  marketingOptIn?: boolean;
  [key: string]: string | boolean | number | undefined;
};

export interface ContactFormProps {
  fields: FormField[];
  privacyNotice: string;
  requireAcknowledgement: boolean;
  marketingOptIn: boolean;
  captchaSiteKey?: string;
  submitLabel?: string;
  fallbackEmail?: string;
}

export interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: TurnstileOptions) => void;
    };
  }
}
