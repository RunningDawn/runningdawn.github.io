// Shared Forgehaven backend. runningdawn uses the SAME api.forgehaven.io login,
// so these point at the production Forgehaven API and the same Discord app.
// In local dev, vite.config bakes FORGE_API_URL (from .env.local, e.g.
// http://localhost:5002) into __API_URL__ so the app talks to the local forge-api.
export const DISCORD_CLIENT_ID = '1519734763139633354'

export const API_URLS = {
  forgeAPI: typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'https://api.forgehaven.io',
  discordAuthorize: 'https://discord.com/api/oauth2/authorize',
} as const
