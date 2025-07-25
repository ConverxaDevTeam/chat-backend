export default (): any => ({
  database: {
    host: process.env.TYPEORM_HOST,
    port: process.env.TYPEORM_PORT ? parseInt(process.env.TYPEORM_PORT, 10) : undefined,
    user: process.env.TYPEORM_USERNAME,
    pass: process.env.TYPEORM_PASSWORD,
    name: process.env.TYPEORM_DB_NAME,
  },
  session: {
    secretKey: String(process.env.JWT_SECRET_KEY),
    secretKeyRefresh: String(process.env.JWT_SECRET_KEY_REFRESH),
    jwtTokenExpiration: 60 * 60 * 5, // 5 minutos
    jwtTokenRefreshExpiration: 7 * 24 * 60 * 60, // 1 semana
  },
  nodemailer: {
    host: process.env.NODEMAILER_HOST,
    port: process.env.NODEMAILER_PORT ? parseInt(process.env.NODEMAILER_PORT, 10) : undefined,
    username: process.env.NODEMAILER_USER,
    password: process.env.NODEMAILER_PASS,
    from: process.env.NODEMAILER_FROM,
  },
  url: {
    files: process.env.URL_FILES,
    wss: process.env.URL_WSS,
    web_hook_whatsapp: process.env.URL_WEBHOOK_WA,
    frontend: process.env.URL_FRONTEND,
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    webhookSecret: process.env.FACEBOOK_WEBHOOK_SECRET,
    facebookGraphApi: process.env.FACEBOOK_GRAPH_API,
    token: process.env.FACEBOOK_TOKEN,
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    from: process.env.MAILGUN_FROM,
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    redirectUri: process.env.SLACK_REDIRECT_URI,
  },
  RESET_PASSWORD_CODE_EXPIRATION: process.env.RESET_PASSWORD_CODE_EXPIRATION || '15', // minutes
  socialLinks: {
    x: process.env.SOCIAL_LINK_X || 'https://x.com/SOF_IA_CHAT',
    linkedin: process.env.SOCIAL_LINK_LINKEDIN || 'https://www.linkedin.com/company/converxa',
    instagram: process.env.SOCIAL_LINK_INSTAGRAM || 'https://www.instagram.com/converxa/',
    facebook: process.env.SOCIAL_LINK_FACEBOOK || 'https://www.facebook.com/converxa',
  },
  organizationLimits: {
    defaultDepartmentLimit: process.env.DEFAULT_DEPARTMENT_LIMIT ? parseInt(process.env.DEFAULT_DEPARTMENT_LIMIT, 10) : 5,
  },
});
