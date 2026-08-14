interface AnalyticsConfig {
  gaMeasurementId: string;
  posthogKey: string;
  posthogHost: string;
}

const CONSENT_KEY = "site-analytics-consent";

function loadGoogleAnalytics(measurementId: string): void {
  if (!measurementId || document.querySelector(`[data-ga="${measurementId}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.ga = measurementId;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) { window.dataLayer.push(args); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });
}

async function loadPosthog(config: AnalyticsConfig): Promise<void> {
  if (!config.posthogKey || !config.posthogHost) return;
  const posthogModule = await import("posthog-js");
  posthogModule.default.init(config.posthogKey, { api_host: config.posthogHost, persistence: "memory" });
}

function load(config: AnalyticsConfig): void {
  loadGoogleAnalytics(config.gaMeasurementId);
  void loadPosthog(config);
}

export function initConsentAnalytics(config: AnalyticsConfig): void {
  const banner = document.querySelector<HTMLElement>("[data-cookie-banner]");
  const stored = window.localStorage.getItem(CONSENT_KEY);
  if (stored === "accepted") load(config);
  if (!stored && banner) banner.hidden = false;
  banner?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const choice = target.closest<HTMLButtonElement>("[data-consent]")?.dataset.consent;
    if (choice !== "accept" && choice !== "reject") return;
    window.localStorage.setItem(CONSENT_KEY, choice === "accept" ? "accepted" : "rejected");
    banner.hidden = true;
    if (choice === "accept") load(config);
  });
}

const analyticsBanner = document.querySelector<HTMLElement>("[data-cookie-banner]");
if (analyticsBanner) {
  initConsentAnalytics({
    gaMeasurementId: analyticsBanner.dataset.gaMeasurementId ?? "",
    posthogKey: analyticsBanner.dataset.posthogKey ?? "",
    posthogHost: analyticsBanner.dataset.posthogHost ?? "",
  });
}

declare global {
  interface Window {
    dataLayer: unknown[][];
    gtag: (...args: unknown[]) => void;
  }
}
