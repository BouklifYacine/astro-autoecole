declare module 'astro:env/client' {
	export const PUBLIC_TURNSTILE_SITE_KEY: string | undefined;	
	export const PUBLIC_GA4_MEASUREMENT_ID: string | undefined;	
	export const PUBLIC_POSTHOG_KEY: string | undefined;	
	export const PUBLIC_POSTHOG_HOST: string;	
}declare module 'astro:env/server' {
	export const SITE_URL: string | undefined;	
	export const TURNSTILE_SECRET_KEY: string | undefined;	
	export const LEAD_WEBHOOK_URL: string | undefined;	
	export const LEAD_WEBHOOK_SECRET: string | undefined;	
	export const CAL_BOOKING_URL: string | undefined;	
	export const RESEND_API_KEY: string | undefined;	
	export const UPSTASH_REDIS_REST_URL: string | undefined;	
	export const UPSTASH_REDIS_REST_TOKEN: string | undefined;	
	export const MAIL_FROM: string | undefined;	
	export const MAIL_NOTIFY_TO: string | undefined;	
}