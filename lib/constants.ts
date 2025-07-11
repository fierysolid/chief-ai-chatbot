export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const IS_PRODUCTION_ENV: boolean =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
export const IS_PREVIEW_ENV: boolean =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

function getBaseUrl() {
  if (IS_PRODUCTION_ENV) {
    return `https://sched.tech`;
  } else if (IS_PREVIEW_ENV) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  } else {
    return 'http://localhost:3000';
  }
}

export const BASE_URL = getBaseUrl();
