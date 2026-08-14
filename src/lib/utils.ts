import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function formatDate(date: Date, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
}
