import type { AnyFieldApi } from '@tanstack/react-form';

import type { FormField } from '@/config/schema';
import { getErrorMessage } from '@/lib/forms/errors';

const TEXT_INPUT_CLASS =
  'w-full rounded-(--radius-base) border border-(--color-border) px-3 py-2 text-base';

interface ContactFieldProps {
  field: FormField;
  fieldApi: AnyFieldApi;
  id: string;
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function ContactField({ field, fieldApi, id }: ContactFieldProps) {
  const shouldShowError =
    fieldApi.state.meta.isTouched ||
    fieldApi.form.state.submissionAttempts > 0;
  const error = shouldShowError
    ? getErrorMessage(fieldApi.state.meta.errors[0])
    : undefined;
  const errorId = id + '-error';
  const describedBy = error ? errorId : undefined;

  if (field.type === 'checkbox') {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-sm">
          <input
            id={id}
            name={fieldApi.name}
            type="checkbox"
            checked={fieldApi.state.value === true}
            required={field.required}
            onBlur={fieldApi.handleBlur}
            onChange={(event) => fieldApi.handleChange(event.target.checked)}
            aria-invalid={error !== undefined}
            aria-describedby={describedBy}
            className="mt-1 size-5"
          />
          <span>
            {field.label}
            {field.required && <span aria-hidden="true"> *</span>}
          </span>
        </label>
        {error && (
          <p id={errorId} role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  const commonProps = {
    id,
    name: fieldApi.name,
    required: field.required,
    'aria-invalid': error !== undefined,
    'aria-describedby': describedBy,
    autoComplete: field.autocomplete,
    placeholder: field.placeholder,
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          {...commonProps}
          rows={6}
          value={textValue(fieldApi.state.value)}
          onBlur={fieldApi.handleBlur}
          onChange={(event) => fieldApi.handleChange(event.target.value)}
          minLength={field.min}
          maxLength={field.max}
          className={TEXT_INPUT_CLASS}
        />
      ) : field.type === 'select' ? (
        <select
          {...commonProps}
          value={textValue(fieldApi.state.value)}
          onBlur={fieldApi.handleBlur}
          onChange={(event) => fieldApi.handleChange(event.target.value)}
          className={TEXT_INPUT_CLASS}
        >
          <option value="">—</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...commonProps}
          type={field.type}
          value={textValue(fieldApi.state.value)}
          onBlur={fieldApi.handleBlur}
          onChange={(event) => fieldApi.handleChange(event.target.value)}
          minLength={field.min}
          maxLength={field.max}
          className={TEXT_INPUT_CLASS}
        />
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
