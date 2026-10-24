/**
 * A vehicle's id is a 36-character UUID, too long for a card or to read out. Its first block is still the
 * vehicle's own id (not an invented code), short enough to quote.
 */
export function vehicleCode(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
