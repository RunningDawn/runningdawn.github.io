// Shared Forgehaven backend. runningdawn uses the SAME api.forgehaven.io login,
// so these point at the production Forgehaven API and the same Discord app.
export const DISCORD_CLIENT_ID = '1519734763139633354'

export const API_URLS = {
  forgeAPI: 'https://api.forgehaven.io',
  discordAuthorize: 'https://discord.com/api/oauth2/authorize',
} as const
