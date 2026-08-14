import { z } from 'zod';

import type { FormField } from '@/config/schema';
import type { ContactFormValues } from '@/types/contact-form';

export const PHONE_PATTERN = /^[+()0-9][0-9().\s-]{5,31}$/;

const REQUIRED_MESSAGE = 'Ce champ est requis.';

export const requiredCheckboxSchema = z.boolean().refine((value) => value, {
  error: REQUIRED_MESSAGE,
});

function maxMessage(max: number): string {
  return max + ' caractères maximum.';
}

interface FieldSchemaOptions {
  /**
   * Server payloads use undefined for optional empty fields. The browser keeps
   * empty strings so the controlled inputs stay simple.
   */
  normalizeOptional?: boolean;
}

/**
 * Builds validation from the same field definition that renders the input.
 *
 * The server uses the default normalization. The client disables it because
 * TanStack Form should keep an empty optional input as a string value.
 */
export function buildFormFieldSchema(
  field: FormField,
  options: FieldSchemaOptions = {},
): z.ZodType {
  const normalizeOptional = options.normalizeOptional ?? true;

  if (field.type === 'checkbox') {
    return field.required ? requiredCheckboxSchema : z.boolean();
  }

  let schema: z.ZodType;

  switch (field.type) {
    case 'email':
      schema = z
        .string()
        .trim()
        .max(field.max ?? 254, {
          error: maxMessage(field.max ?? 254),
        })
        .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
          error: 'Adresse email invalide.',
        });
      break;
    case 'tel':
      schema = z
        .string()
        .trim()
        .max(field.max ?? 32, {
          error: maxMessage(field.max ?? 32),
        })
        .refine((value) => value.length === 0 || PHONE_PATTERN.test(value), {
          error: 'Numéro de téléphone invalide.',
        });
      break;
    case 'select': {
      const optionsList = field.options;
      schema = z
        .string()
        .trim()
        .max(field.max ?? 2000, {
          error: maxMessage(field.max ?? 2000),
        })
        .refine(
          (value) =>
            value.length === 0 ||
            !optionsList?.length ||
            optionsList.includes(value),
          {
            error: 'Valeur non autorisée.',
          },
        );
      break;
    }
    case 'text':
    case 'textarea':
    default:
      schema = z.string().trim().max(field.max ?? 2000, {
        error: maxMessage(field.max ?? 2000),
      });
  }

  const textSchema = schema as z.ZodType<string>;

  if (field.required) {
    return textSchema.refine(
      (value) => value.length >= (field.min ?? 1),
      {
        error:
          field.min === undefined
            ? REQUIRED_MESSAGE
            : field.min + ' caractères minimum.',
      },
    );
  }

  if (!normalizeOptional) {
    return textSchema;
  }

  return textSchema.transform((value) => value || undefined).optional();
}

export function buildContactFormSchema(
  fields: FormField[],
  requireAcknowledgement: boolean,
): z.ZodType<ContactFormValues, ContactFormValues> {
  const shape: Record<string, z.ZodType> = {
    website: z.string().max(200),
    acknowledgement: requireAcknowledgement
      ? requiredCheckboxSchema
      : z.boolean(),
    marketingOptIn: z.boolean(),
  };

  for (const field of fields) {
    shape[field.name] = buildFormFieldSchema(field, {
      normalizeOptional: false,
    });
  }

  return z.strictObject(shape) as unknown as z.ZodType<
    ContactFormValues,
    ContactFormValues
  >;
}
