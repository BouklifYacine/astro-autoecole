import type { AnyFieldApi } from '@tanstack/react-form';

import { getErrorMessage } from '@/lib/forms/errors';

interface ContactConsentFieldProps {
  fieldApi: AnyFieldApi;
  id: string;
  label: string;
  required?: boolean;
}

export function ContactConsentField({
  fieldApi,
  id,
  label,
  required = false,
}: ContactConsentFieldProps) {
  const shouldShowError =
    fieldApi.state.meta.isTouched ||
    fieldApi.form.state.submissionAttempts > 0;
  const error = shouldShowError
    ? getErrorMessage(fieldApi.state.meta.errors[0])
    : undefined;
  const errorId = id + '-error';

  return (
    <div>
      <label className="flex items-start gap-3 text-sm">
        <input
          id={id}
          type="checkbox"
          name={fieldApi.name}
          checked={fieldApi.state.value === true}
          required={required}
          onBlur={fieldApi.handleBlur}
          onChange={(event) => fieldApi.handleChange(event.target.checked)}
          aria-invalid={error !== undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 size-5"
        />
        <span>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </span>
      </label>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
