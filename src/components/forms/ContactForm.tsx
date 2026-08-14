import { useId, useMemo, useRef } from 'react';
import { revalidateLogic, useForm } from '@tanstack/react-form';

import { ContactConsentField } from '@/components/forms/ContactConsentField';
import { ContactField } from '@/components/forms/ContactField';
import { TurnstileWidget } from '@/components/forms/TurnstileWidget';
import type { FormField } from '@/config/schema';
import { leadApiResponseSchema } from '@/lib/forms/api-schema';
import { getFormErrorMessage } from '@/lib/forms/errors';
import { buildContactFormSchema } from '@/lib/forms/schema';
import type {
  ContactFormProps,
  ContactFormValues,
  ContactSubmissionPayload,
} from '@/types/contact-form';

function createDefaultValues(fields: FormField[]): ContactFormValues {
  const values: ContactFormValues = {
    website: '',
    acknowledgement: false,
    marketingOptIn: false,
  };

  for (const field of fields) {
    values[field.name] = field.type === 'checkbox' ? false : '';
  }

  return values;
}

/**
 * Rendered from site.config.form.fields, so a new project changes the config
 * rather than this component.
 *
 * Hydrated with client:visible: the form is below the fold on the pages where
 * it appears, and its browser interaction is not needed for the initial render.
 */
export default function ContactForm({
  fields,
  privacyNotice,
  requireAcknowledgement,
  marketingOptIn,
  captchaSiteKey,
  submitLabel = 'Envoyer',
  fallbackEmail,
}: ContactFormProps) {
  const formId = useId();
  const formElementRef = useRef<HTMLFormElement>(null);
  const captchaTokenRef = useRef('');

  // Generated once per mount and reused across retries: the server refuses to
  // deliver the same id twice, so a double click cannot create two leads.
  const submissionId = useRef(crypto.randomUUID());
  const startedAt = useRef(Date.now());
  const defaultValues = useMemo(() => createDefaultValues(fields), [fields]);
  const validationSchema = useMemo(
    () => buildContactFormSchema(fields, requireAcknowledgement),
    [fields, requireAcknowledgement],
  );

  const form = useForm({
    defaultValues,
    validationLogic: revalidateLogic({
      mode: 'blur',
      modeAfterSubmission: 'change',
    }),
    validators: {
      onDynamic: validationSchema,
      // This endpoint is also the server-side validator: returning fields
      // lets TanStack Form attach API errors to the matching inputs.
      onSubmitAsync: async ({ value }) => {
        const formElement = formElementRef.current;
        const browserFormData = formElement ? new FormData(formElement) : null;
        const payload: ContactSubmissionPayload = {
          submissionId: submissionId.current,
          startedAt: startedAt.current,
          website: String(browserFormData?.get('website') ?? ''),
        };

        for (const field of fields) {
          payload[field.name] = value[field.name];
        }

        if (captchaSiteKey) payload.captchaToken = captchaTokenRef.current;
        if (requireAcknowledgement) {
          payload.acknowledgement = value.acknowledgement === true;
        }
        if (marketingOptIn) {
          payload.marketingOptIn = value.marketingOptIn === true;
        }

        try {
          const response = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const parsedResult = leadApiResponseSchema.safeParse(
            await response.json(),
          );

          if (!parsedResult.success) {
            return {
              form: 'Réponse serveur invalide. Merci de réessayer.',
            };
          }

          const result = parsedResult.data;

          if (result.ok) {
            window.location.assign(result.redirectTo);
            return;
          }

          return {
            form: result.message ?? "L'envoi a échoué.",
            ...(result.fieldErrors ? { fields: result.fieldErrors } : {}),
          };
        } catch {
          return {
            form: fallbackEmail
              ? 'Connexion impossible. Écrivez-nous à ' + fallbackEmail + '.'
              : 'Connexion impossible. Merci de réessayer.',
          };
        }
      },
    },
  });

  return (
    <form
      ref={formElementRef}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      {fields.map((field) => (
        <form.Field key={field.name} name={field.name}>
          {(fieldApi) => (
            <ContactField
              field={field}
              fieldApi={fieldApi}
              id={formId + '-' + field.name}
            />
          )}
        </form.Field>
      ))}

      {/* Honeypot: off-screen rather than display:none, which some bots detect. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label htmlFor={formId + '-website'}>Ne pas remplir</label>
        <input
          id={formId + '-website'}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {requireAcknowledgement && (
        <form.Field name="acknowledgement">
          {(fieldApi) => (
            <ContactConsentField
              fieldApi={fieldApi}
              id={formId + '-acknowledgement'}
              label="J'ai lu et compris l'utilisation de mes données."
              required
            />
          )}
        </form.Field>
      )}

      {marketingOptIn && (
        <form.Field name="marketingOptIn">
          {(fieldApi) => (
            <ContactConsentField
              fieldApi={fieldApi}
              id={formId + '-marketingOptIn'}
              label="Je souhaite recevoir des actualités par email (facultatif)."
            />
          )}
        </form.Field>
      )}

      {captchaSiteKey && (
        <TurnstileWidget
          siteKey={captchaSiteKey}
          onToken={(token) => {
            captchaTokenRef.current = token;
          }}
        />
      )}

      <form.Subscribe
        selector={(state) => [state.isSubmitting, state.errorMap.onSubmit] as const}
      >
        {([isSubmitting, submitError]) => {
          const formError = getFormErrorMessage(submitError);

          return (
            <>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-base bg-brand px-5 py-3 text-brand-contrast disabled:opacity-60"
              >
                {isSubmitting ? 'Envoi…' : submitLabel}
              </button>

              {formError && (
                <p role="status" aria-live="polite" className="text-sm text-red-700">
                  {formError}
                </p>
              )}
            </>
          );
        }}
      </form.Subscribe>

      <p className="text-xs text-muted">{privacyNotice}</p>
    </form>
  );
}
