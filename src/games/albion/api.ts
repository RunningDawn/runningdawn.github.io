import { forgeFetch } from '../../lib/api'

// Albion-facing alias for the shared credentialed wrapper. Use for all Albion
// API calls; never call fetch() directly against the backend.
export const albionFetch = forgeFetch
