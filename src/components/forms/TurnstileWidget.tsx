import { useEffect, useRef } from 'react';

import type { TurnstileOptions } from '@/types/contact-form';

interface TurnstileWidgetProps {
  siteKey?: string;
  onToken: (token: string) => void;
}

export function TurnstileWidget({
  siteKey,
  onToken,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    const container = containerRef.current;
    const render = () => {
      if (!window.turnstile || !containerRef.current) return;

      const options: TurnstileOptions = {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
      };

      window.turnstile.render(containerRef.current, options);
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-contact-turnstile]',
    );

    if (existingScript) {
      if (window.turnstile) render();
      else existingScript.addEventListener('load', render);

      return () => {
        existingScript.removeEventListener('load', render);
        container.replaceChildren();
      };
    }

    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.contactTurnstile = 'true';
    script.addEventListener('load', render);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', render);
      script.remove();
      container.replaceChildren();
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
}
