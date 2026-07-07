// Parse a backend timestamp as UTC. Lake timestamps are naive (no zone) and must be read
// as UTC, so append 'Z'. But some backend timestamps are timezone-AWARE isoformat and already
// carry 'Z' or a numeric offset like '+00:00' (e.g. Best Value's computed_at) - appending 'Z'
// to those yields an invalid date. Only append when no zone designator is present.
export function utcDate(ts: string): Date {
  return new Date(/[Zz]$|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts + 'Z')
}
