// Chain configs for dust sweeper - maps our supported chains to Relay chain IDs
export const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', relayId: 1 },
  { id: 8453, name: 'Base', symbol: 'ETH', relayId: 8453 },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', relayId: 42161 },
  { id: 10, name: 'Optimism', symbol: 'ETH', relayId: 10 },
  { id: 137, name: 'Polygon', symbol: 'POL', relayId: 137 },
  { id: 56, name: 'BSC', symbol: 'BNB', relayId: 56 },
] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]['id'];

export const CHAIN_BY_ID = Object.fromEntries(
  SUPPORTED_CHAINS.map((c) => [c.id, c])
) as Record<SupportedChainId, (typeof SUPPORTED_CHAINS)[number]>;
