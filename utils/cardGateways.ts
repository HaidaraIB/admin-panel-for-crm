/**
 * Which gateways are card processors, for UI copy only.
 *
 * The rule that only one card gateway may be enabled is enforced by the API
 * (subscriptions/services/gateway_activation.py): enabling one switches the
 * others off in the same transaction, and the response reports what it
 * disabled. This file exists purely so the confirmation dialog can warn the
 * operator beforehand — it must never be the thing that performs the change.
 */

/** Same alias sets the backend adapters use to resolve operator-typed names. */
const CARD_GATEWAY_ALIASES = [
  'paytabs',
  'pay tabs',
  'stripe',
  'alqaseh',
  'al qaseh',
  'al-qaseh',
  'qaseh',
];

export const isCardGatewayName = (name: string): boolean => {
  const nameLower = (name || '').toLowerCase();
  return CARD_GATEWAY_ALIASES.some(alias => nameLower.includes(alias));
};

/**
 * The enabled card gateways that turning `gatewayName` on would switch off.
 * `excludeId` keeps a gateway from listing itself.
 */
export const enabledCardRivals = <T extends { id: string; name: string; enabled: boolean }>(
  gateways: T[],
  gatewayName: string,
  excludeId?: string
): T[] => {
  if (!isCardGatewayName(gatewayName)) return [];
  return gateways.filter(
    gw => gw.id !== excludeId && gw.enabled && isCardGatewayName(gw.name)
  );
};
