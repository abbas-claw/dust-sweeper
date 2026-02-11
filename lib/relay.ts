const RELAY_API = 'https://api.relay.link';

export interface RelayCurrency {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  vmType: string;
  metadata: {
    logoURI: string;
    verified: boolean;
  };
}

/**
 * Fetch Relay's curated token list for given chains.
 * Returns only ERC-20s (filters out native 0x000...000).
 */
export async function fetchRelayCurrencies(
  chainIds: number[],
  limit = 100
): Promise<RelayCurrency[]> {
  const res = await fetch(`${RELAY_API}/currencies/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chainIds, limit, verified: true }),
  });

  if (!res.ok) throw new Error(`Relay currencies failed: ${res.status}`);
  const data: RelayCurrency[] = await res.json();

  // Filter out native token (address 0x0...0) — we handle that separately
  return data.filter(
    (c) => c.address !== '0x0000000000000000000000000000000000000000'
  );
}

export interface RelayQuote {
  steps: Array<{
    id: string;
    action: string;
    kind: string;
    items: Array<{
      status: string;
      data: {
        from: string;
        to: string;
        data: string;
        value: string;
        chainId: number;
      };
    }>;
  }>;
  details: {
    currencyIn: { amountFormatted: string; amountUsd: string };
    currencyOut: { amountFormatted: string; amountUsd: string };
  };
  fees: {
    gas: { amountUsd: string };
    relayer: { amountUsd: string };
  };
}

/**
 * Get a swap quote from Relay — dust token -> native gas token on the same chain.
 */
export async function getRelayQuote(params: {
  user: string;
  originChainId: number;
  originCurrency: string; // token contract address
  destinationChainId: number;
  destinationCurrency: string; // 0x000...0 for native
  amount: string; // raw amount (wei/units)
}): Promise<RelayQuote> {
  const res = await fetch(`${RELAY_API}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: params.user,
      originChainId: params.originChainId,
      originCurrency: params.originCurrency,
      destinationChainId: params.destinationChainId,
      destinationCurrency: params.destinationCurrency,
      amount: params.amount,
      tradeType: 'EXACT_INPUT',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Relay quote failed: ${res.status} — ${err}`);
  }

  return res.json();
}

/**
 * Get token price in USD from Relay.
 */
export async function getTokenPrice(
  chainId: number,
  address: string
): Promise<number> {
  const res = await fetch(
    `${RELAY_API}/currencies/token/price?chainId=${chainId}&address=${address}&currency=usd`
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return data?.price ?? 0;
}
