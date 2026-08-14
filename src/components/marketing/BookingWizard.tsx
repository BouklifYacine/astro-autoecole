import { useMemo, useRef, useState } from 'react';

import { leadApiResponseSchema } from '@/lib/forms/api-schema';
import { PHONE_PATTERN } from '@/lib/forms/schema';

/**
 * The booking flow.
 *
 * What it is: a request for a slot. What it is NOT: a confirmed reservation.
 * There is no availability backend, so the flow asks for day and time-of-day
 * PREFERENCES instead of showing a calendar of slots. Displaying "mardi 14h —
 * disponible" would be inventing data, and the visitor would find out it was
 * fiction at the worst possible moment.
 *
 * The submission goes through the real /api/leads pipeline. That endpoint
 * validates with `z.strictObject` against `site.config.form.fields`, so this
 * component may only send the declared keys — the structured choices are
 * composed into `message` rather than added as new fields.
 */

const TRANSMISSIONS = ['Boîte manuelle', 'Boîte automatique'] as const;
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const;
const TRANCHES = ['Matin (9 h – 12 h)', 'Après-midi (14 h – 17 h)', 'Fin de journée (17 h – 19 h)'] as const;

/** Formations whose transmission is already in the name: asking again is noise. */
const IMPLIED_TRANSMISSION: Record<string, string> = {
  'Permis B — boîte manuelle': 'Boîte manuelle',
  'Permis B — boîte automatique': 'Boîte automatique',
};

const NO_VEHICLE = 'Code de la route';

export interface BookingWizardProps {
  formations: { formValue: string; name: string; public: string }[];
  lieux: { name: string }[];
  phone: string;
  email: string;
  privacyNotice: string;
}

type StepId = 'formation' | 'transmission' | 'lieu' | 'dispos' | 'coordonnees';

const STEP_LABELS: Record<StepId, string> = {
  formation: 'Formation',
  transmission: 'Boîte',
  lieu: 'Lieu',
  dispos: 'Disponibilités',
  coordonnees: 'Coordonnées',
};

/**
 * Functional updater on purpose. Reading the state captured at render
 * (`setJours(toggle(jours, x))`) drops one of two selections made inside the
 * same batch — two quick taps on the day chips would only register the last.
 */
function toggle(value: string) {
  return (list: string[]): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function BookingWizard({
  formations,
  lieux,
  phone,
  email,
  privacyNotice,
}: BookingWizardProps) {
  const [formation, setFormation] = useState('');
  const [transmission, setTransmission] = useState('');
  const [lieu, setLieu] = useState('');
  const [jours, setJours] = useState<string[]>([]);
  const [tranches, setTranches] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email_, setEmail] = useState('');
  const [phone_, setPhone] = useState('');

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  // Generated once per mount: the server refuses the same id twice, so a double
  // click cannot create two leads.
  const submissionId = useRef(crypto.randomUUID());
  const startedAt = useRef(Date.now());

  // The step list depends on the answers: a Permis B automatique never sees a
  // transmission step, and the code-only formation never sees a meeting point.
  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ['formation'];
    if (formation && !IMPLIED_TRANSMISSION[formation] && formation !== NO_VEHICLE) {
      list.push('transmission');
    }
    if (formation !== NO_VEHICLE) list.push('lieu');
    list.push('dispos', 'coordonnees');
    return list;
  }, [formation]);

  const current = steps[Math.min(index, steps.length - 1)];

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email_.trim());
  const phoneValid = PHONE_PATTERN.test(phone_.trim());
  const nameValid = name.trim().length >= 2;

  const canContinue =
    current === 'formation'
      ? formation !== ''
      : current === 'transmission'
        ? transmission !== ''
        : current === 'lieu'
          ? lieu !== ''
          : current === 'dispos'
            ? jours.length > 0 && tranches.length > 0
            : nameValid && emailValid && phoneValid;

  const resolvedTransmission = IMPLIED_TRANSMISSION[formation] ?? transmission;

  function buildMessage(): string {
    const lines = [
      'Demande de créneau envoyée depuis le site.',
      `Formation : ${formation}`,
      resolvedTransmission ? `Boîte : ${resolvedTransmission}` : null,
      lieu ? `Point de rendez-vous : ${lieu}` : null,
      `Jours souhaités : ${jours.join(', ')}`,
      `Tranches horaires : ${tranches.join(', ')}`,
    ];
    return lines.filter(Boolean).join('\n');
  }

  async function submit() {
    setStatus('sending');
    setErrorMessage('');

    try {
      // Trailing slash required — see astro.config `trailingSlash: 'always'`.
      const response = await fetch('/api/leads/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submissionId.current,
          startedAt: startedAt.current,
          website: '',
          name: name.trim(),
          email: email_.trim(),
          phone: phone_.trim(),
          formation,
          message: buildMessage(),
        }),
      });

      const parsed = leadApiResponseSchema.safeParse(await response.json());

      if (!parsed.success) {
        setStatus('error');
        setErrorMessage('Réponse inattendue du serveur.');
        return;
      }

      if (parsed.data.ok) {
        setStatus('sent');
        return;
      }

      setStatus('error');
      setErrorMessage(parsed.data.message);
    } catch {
      setStatus('error');
      setErrorMessage('La connexion a échoué.');
    }
  }

  if (status === 'sent') {
    return (
      <div className="p-6 text-center sm:p-10">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-tint text-success">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-6">
            <path
              d="m3.5 8.5 3 3 6-7"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3 className="font-heading mt-5 text-xl font-semibold text-ink">Demande envoyée.</h3>
        <p className="mx-auto mt-3 max-w-md text-[0.95rem] text-muted-foreground">
          On te rappelle sous 24 h ouvrées au {phone_ || 'numéro indiqué'} avec les créneaux
          réellement libres chez ton moniteur. Rien n’est réservé tant que cet appel n’a pas eu lieu.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-8">
      {/* Step indicator. The lane markings mean progression and nothing else:
          solid behind a step you have passed, dashed ahead of it. */}
      <ol className="mb-8 flex items-center gap-2" aria-label="Étapes de la demande">
        {steps.map((step, stepIndex) => {
          const done = stepIndex < index;
          const active = stepIndex === index;
          return (
            <li key={step} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              <span
                aria-current={active ? 'step' : undefined}
                className={[
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done || active ? 'bg-brand text-brand-contrast' : 'bg-brand-tint text-brand',
                ].join(' ')}
              >
                {stepIndex + 1}
              </span>
              <span
                className={[
                  'hidden truncate text-xs sm:block',
                  active ? 'font-medium text-ink' : 'text-muted-foreground',
                ].join(' ')}
              >
                {STEP_LABELS[step]}
              </span>
              {stepIndex < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="lane-rule min-w-4 flex-1 text-brand"
                  data-complete={done ? '' : undefined}
                  style={{ ['--lane-dash' as string]: '0.5rem', ['--lane-gap' as string]: '0.4rem' }}
                />
              )}
            </li>
          );
        })}
      </ol>

      {current === 'formation' && (
        <fieldset>
          <legend className="font-heading text-lg font-semibold text-ink">
            Quelle formation t’intéresse&nbsp;?
          </legend>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {formations.map((item) => (
              <Choice
                key={item.formValue}
                selected={formation === item.formValue}
                label={item.name}
                hint={item.public}
                onClick={() => {
                  setFormation(item.formValue);
                  setTransmission('');
                }}
              />
            ))}
          </div>
        </fieldset>
      )}

      {current === 'transmission' && (
        <fieldset>
          <legend className="font-heading text-lg font-semibold text-ink">
            Sur quelle boîte veux-tu conduire&nbsp;?
          </legend>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {TRANSMISSIONS.map((item) => (
              <Choice
                key={item}
                selected={transmission === item}
                label={item}
                onClick={() => setTransmission(item)}
              />
            ))}
          </div>
        </fieldset>
      )}

      {current === 'lieu' && (
        <fieldset>
          <legend className="font-heading text-lg font-semibold text-ink">
            D’où veux-tu partir&nbsp;?
          </legend>
          <p className="mt-2 text-sm text-muted-foreground">Tu pourras en changer d’une leçon à l’autre.</p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {lieux.map((item) => (
              <Choice
                key={item.name}
                selected={lieu === item.name}
                label={item.name}
                onClick={() => setLieu(item.name)}
              />
            ))}
          </div>
        </fieldset>
      )}

      {current === 'dispos' && (
        <div className="space-y-7">
          <fieldset>
            <legend className="font-heading text-lg font-semibold text-ink">
              Quels jours t’arrangent&nbsp;?
            </legend>
            <p className="mt-2 text-sm text-muted-foreground">
              Plusieurs choix possibles. On ne t’affiche pas de créneaux ici&nbsp;: seuls les
              plannings réels des moniteurs font foi, et on te les donne au téléphone.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {JOURS.map((jour) => (
                <Chip
                  key={jour}
                  selected={jours.includes(jour)}
                  label={jour}
                  onClick={() => setJours(toggle(jour))}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-heading text-base font-semibold text-ink">
              À quelles heures&nbsp;?
            </legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {TRANCHES.map((tranche) => (
                <Chip
                  key={tranche}
                  selected={tranches.includes(tranche)}
                  label={tranche}
                  onClick={() => setTranches(toggle(tranche))}
                />
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {current === 'coordonnees' && (
        <div>
          <h3 className="font-heading text-lg font-semibold text-ink">Comment te joindre&nbsp;?</h3>

          <dl className="mt-5 grid gap-x-4 gap-y-1.5 rounded-(--radius-base) bg-brand-tint p-4 text-sm sm:grid-cols-2">
            <Recap label="Formation" value={formation} />
            {resolvedTransmission && <Recap label="Boîte" value={resolvedTransmission} />}
            {lieu && <Recap label="Départ" value={lieu} />}
            <Recap label="Disponibilités" value={`${jours.join(', ')} — ${tranches.join(', ')}`} />
          </dl>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Text
              id="bw-name"
              label="Prénom et nom"
              value={name}
              onChange={setName}
              autoComplete="name"
              error={showFieldErrors && !nameValid ? '2 caractères minimum.' : undefined}
            />
            <Text
              id="bw-phone"
              label="Téléphone"
              type="tel"
              value={phone_}
              onChange={setPhone}
              autoComplete="tel"
              error={showFieldErrors && !phoneValid ? 'Numéro de téléphone invalide.' : undefined}
            />
            <div className="sm:col-span-2">
              <Text
                id="bw-email"
                label="Email"
                type="email"
                value={email_}
                onChange={setEmail}
                autoComplete="email"
                error={showFieldErrors && !emailValid ? 'Adresse email invalide.' : undefined}
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {privacyNotice}{' '}
            <a href="/politique-confidentialite/" className="text-brand">
              Politique de confidentialité
            </a>
          </p>
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="mt-6 rounded-(--radius-base) border border-(--color-border) bg-white p-4 text-sm"
        >
          <p className="font-medium text-ink">{errorMessage}</p>
          <p className="mt-1.5 text-muted-foreground">
            Appelle-nous au{' '}
            <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-medium text-brand">
              {phone}
            </a>{' '}
            ou écris à{' '}
            <a href={`mailto:${email}`} className="font-medium text-brand">
              {email}
            </a>
            .
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        {index > 0 && (
          <button
            type="button"
            onClick={() => {
              setIndex(index - 1);
              setShowFieldErrors(false);
            }}
            className="rounded-(--radius-base) px-4 text-sm font-medium text-muted-foreground hover:text-ink sm:w-auto"
          >
            Retour
          </button>
        )}

        {/* Full-width primary action, Doctronic-style: one obvious next move. */}
        <button
          type="button"
          disabled={status === 'sending'}
          onClick={() => {
            if (!canContinue) {
              setShowFieldErrors(true);
              return;
            }
            if (current === 'coordonnees') {
              void submit();
              return;
            }
            setIndex(index + 1);
          }}
          aria-disabled={!canContinue}
          className={[
            'flex-1 rounded-(--radius-base) px-6 text-base font-medium transition-colors',
            canContinue && status !== 'sending'
              ? 'bg-brand text-brand-contrast hover:bg-brand-hover'
              : 'cursor-not-allowed bg-brand/35 text-white',
          ].join(' ')}
        >
          {status === 'sending'
            ? 'Envoi…'
            : current === 'coordonnees'
              ? 'Envoyer ma demande de créneau'
              : 'Continuer'}
        </button>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 size-3.5 shrink-0">
          <path
            d="M4 7V5a4 4 0 0 1 8 0v2M3.5 7h9v6h-9z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        Aucune donnée bancaire n’est demandée et rien n’est réservé automatiquement. Un moniteur te
        rappelle pour confirmer un créneau réel.
      </p>
    </div>
  );
}

function Choice({
  selected,
  label,
  hint,
  onClick,
}: {
  selected: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'flex items-start gap-3 rounded-(--radius-base) border p-4 text-left transition-colors',
        selected
          ? 'border-brand bg-brand-tint'
          : 'border-(--color-border) bg-white hover:border-brand',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-brand bg-brand text-white' : 'border-(--color-border)',
        ].join(' ')}
      >
        {selected && (
          <svg viewBox="0 0 16 16" fill="none" className="size-3">
            <path
              d="m3.5 8.5 3 3 6-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.95rem] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function Chip({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'rounded-full border px-4 text-sm transition-colors',
        selected
          ? 'border-brand bg-brand text-brand-contrast'
          : 'border-(--color-border) bg-white text-ink hover:border-brand',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}&nbsp;:</dt>
      <dd className="min-w-0 font-medium text-ink">{value}</dd>
    </div>
  );
}

function Text({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error !== undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-(--radius-base) border border-(--color-border) bg-white px-3 py-2 text-base"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
