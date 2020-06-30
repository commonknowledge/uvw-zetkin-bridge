// declare module "gocardless-nodejs"
declare module "gocardless-nodejs/webhooks"

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ZETKIN_DOMAIN: string
      ZETKIN_CONSUMER_ID: string
      ZETKIN_CONSUMER_SECRET: string
      ZETKIN_SESSION_SECRET: string
      ZETKIN_CLIENT_PROTOCOL: string
      ZETKIN_CLIENT_DOMAIN: string
      ZETKIN_PROVIDER_PROTOCOL: string
      ZETKIN_ORG_ID: string
      ZETKIN_ADMIN_USERNAME: string
      ZETKIN_ADMIN_PASSWORD: string
      ZETKIN_OTP: string
      ZETKIN_NGROK_DOMAIN: string
      NGROK_TOKEN: string
      ZETKIN_NGROK_REGION: string
      GOCARDLESS_WEBHOOK_ENDPOINT_SECRET: string
      GOCARDLESS_ACCESS_TOKEN: string
      ZAMMAD_BASE_URL: string
      ZAMMAD_ADMIN_USERNAME: string
      ZAMMAD_ADMIN_PASSWORD: string
    }
  }
}

export {};