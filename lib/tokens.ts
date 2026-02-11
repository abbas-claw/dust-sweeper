import { createPublicClient, http, erc20Abi, formatUnits, type Address } from 'viem';
import { mainnet, base, arbitrum, optimism, polygon, bsc } from 'viem/chains';
import { SUPPORTED_CHAINS, type SupportedChainId } from './chains';
import { fetchRelayCurrencies, type RelayCurrency } from './relay';

// Multicall3 is deployed at the same address on all major EVM chains
const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

const viemChains = { 1: mainnet, 8453: base, 42161: arbitrum, 10: optimism, 137: polygon, 56: bsc } as const;

function getClient(chainId: SupportedChainId) {
  const chain = viemChains[chainId];
  return createPublicClient({ chain, transport: http() });
}

export interface DustToken {
  chainId: number;
  chainName: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  logoURI: string;
  usdValue: number | null; // null = unknown
  isNative: boolean;
}

/**
 * Fetch native balance for a wallet on a given chain.
 */
async function getNativeBalance(
  chainId: SupportedChainId,
  wallet: Address
): Promise<bigint> {
  const client = getClient(chainId);
  return client.getBalance({ address: wallet });
}

/**
 * Batch-read ERC-20 balances via multicall.
 * Returns balances in the same order as `tokens`.
 */
async function batchBalances(
  chainId: SupportedChainId,
  wallet: Address,
  tokens: RelayCurrency[]
): Promise<bigint[]> {
  if (tokens.length === 0) return [];

  const client = getClient(chainId);

  const results = await client.multicall({
    contracts: tokens.map((t) => ({
      address: t.address as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [wallet],
    })),
    multicallAddress: MULTICALL3,
    allowFailure: true,
  });

  return results.map((r) =>
    r.status === 'success' ? (r.result as bigint) : 0n
  );
}

/**
 * Discover all tokens with non-zero balances across all supported chains.
 * Uses Relay's curated token list + on-chain multicall.
 */
export async function discoverTokens(
  wallet: Address,
  dustThresholdUsd = 50, // tokens under this USD value = "dust"
  onChainProgress?: (chainId: number, chainName: string) => void
): Promise<DustToken[]> {
  const allTokens: DustToken[] = [];
  const chainIds = SUPPORTED_CHAINS.map((c) => c.id);

  // Fetch Relay's curated token list for all chains at once
  const relayCurrencies = await fetchRelayCurrencies(chainIds, 100);

  // Group by chain
  const currenciesByChain = new Map<number, RelayCurrency[]>();
  for (const c of relayCurrencies) {
    const list = currenciesByChain.get(c.chainId) || [];
    list.push(c);
    currenciesByChain.set(c.chainId, list);
  }

  // Scan each chain in parallel
  const chainScans = SUPPORTED_CHAINS.map(async (chain) => {
    onChainProgress?.(chain.id, chain.name);
    const tokens = currenciesByChain.get(chain.id) || [];
    const results: DustToken[] = [];

    // Native balance
    try {
      const nativeBal = await getNativeBalance(chain.id, wallet);
      if (nativeBal > 0n) {
        results.push({
          chainId: chain.id,
          chainName: chain.name,
          address: '0x0000000000000000000000000000000000000000',
          symbol: chain.symbol,
          name: chain.name,
          decimals: 18,
          balance: nativeBal,
          balanceFormatted: formatUnits(nativeBal, 18),
          logoURI: '',
          usdValue: null,
          isNative: true,
        });
      }
    } catch {
      // skip native balance on error
    }

    // ERC-20 balances via multicall
    try {
      const balances = await batchBalances(chain.id, wallet, tokens);
      for (let i = 0; i < tokens.length; i++) {
        if (balances[i] > 0n) {
          results.push({
            chainId: tokens[i].chainId,
            chainName: chain.name,
            address: tokens[i].address,
            symbol: tokens[i].symbol,
            name: tokens[i].name,
            decimals: tokens[i].decimals,
            balance: balances[i],
            balanceFormatted: formatUnits(balances[i], tokens[i].decimals),
            logoURI: tokens[i].metadata?.logoURI || '',
            usdValue: null,
            isNative: false,
          });
        }
      }
    } catch {
      // multicall failed on this chain, skip
    }

    return results;
  });

  const chainResults = await Promise.allSettled(chainScans);
  for (const r of chainResults) {
    if (r.status === 'fulfilled') allTokens.push(...r.value);
  }

  return allTokens;
}

/**
 * Filter tokens into "dust" (below threshold) vs "keepers".
 */
export function categorizeDust(
  tokens: DustToken[],
  thresholdUsd: number
): { dust: DustToken[]; keepers: DustToken[] } {
  const dust: DustToken[] = [];
  const keepers: DustToken[] = [];

  for (const t of tokens) {
    if (t.isNative) {
      keepers.push(t); // never sweep native gas
    } else if (t.usdValue !== null && t.usdValue < thresholdUsd) {
      dust.push(t);
    } else if (t.usdValue === null) {
      dust.push(t); // unknown value = probably dust
    } else {
      keepers.push(t);
    }
  }

  return { dust, keepers };
}
