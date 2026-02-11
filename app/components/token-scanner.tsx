'use client';

import { useState, useCallback } from 'react';
import { type Address } from 'viem';
import { discoverTokens, categorizeDust, type DustToken } from '@/lib/tokens';
import { TokenList } from './token-list';
import { SweepPanel } from './sweep-panel';

interface Props {
  address: Address;
}

type ScanState = 'idle' | 'scanning' | 'done' | 'error';

export function TokenScanner({ address }: Props) {
  const [state, setState] = useState<ScanState>('idle');
  const [progress, setProgress] = useState('');
  const [dust, setDust] = useState<DustToken[]>([]);
  const [keepers, setKeepers] = useState<DustToken[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(50);
  const [error, setError] = useState('');

  const scan = useCallback(async () => {
    setState('scanning');
    setError('');
    setDust([]);
    setKeepers([]);
    setSelected(new Set());

    try {
      const tokens = await discoverTokens(address, threshold, (_id, name) => {
        setProgress(`Scanning ${name}...`);
      });

      // Try to fetch USD prices from Relay for each token
      setProgress('Fetching prices...');
      const priced = await priceTokens(tokens);

      const { dust: d, keepers: k } = categorizeDust(priced, threshold);
      setDust(d);
      setKeepers(k);

      // Auto-select all dust
      setSelected(new Set(d.map((t) => tokenKey(t))));
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
      setState('error');
    }
  }, [address, threshold]);

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm text-white/50 mb-1">
            Dust threshold (USD)
          </label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            className="w-28 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            min={0}
          />
        </div>
        <button
          onClick={scan}
          disabled={state === 'scanning'}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 rounded-lg font-medium transition-colors"
        >
          {state === 'scanning' ? progress || 'Scanning...' : 'Scan Wallet'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {state === 'done' && (
        <>
          {dust.length === 0 && keepers.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              No tokens found. Your wallet might be empty on these chains.
            </div>
          ) : (
            <>
              {/* Dust tokens */}
              {dust.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">
                      Dust Tokens
                      <span className="ml-2 text-sm text-white/40">
                        ({dust.length} found)
                      </span>
                    </h2>
                    <button
                      onClick={() => {
                        if (selected.size === dust.length) {
                          setSelected(new Set());
                        } else {
                          setSelected(new Set(dust.map((t) => tokenKey(t))));
                        }
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      {selected.size === dust.length
                        ? 'Deselect all'
                        : 'Select all'}
                    </button>
                  </div>
                  <TokenList
                    tokens={dust}
                    selected={selected}
                    onToggle={(key) => {
                      const next = new Set(selected);
                      next.has(key) ? next.delete(key) : next.add(key);
                      setSelected(next);
                    }}
                  />
                </div>
              )}

              {/* Sweep panel */}
              {selected.size > 0 && (
                <SweepPanel
                  tokens={dust.filter((t) => selected.has(tokenKey(t)))}
                  wallet={address}
                />
              )}

              {/* Keeper tokens */}
              {keepers.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">
                    Keeper Tokens
                    <span className="ml-2 text-sm text-white/40">
                      (above ${threshold})
                    </span>
                  </h2>
                  <TokenList tokens={keepers} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function tokenKey(t: DustToken): string {
  return `${t.chainId}:${t.address}`;
}

/**
 * Fetch USD prices for tokens via Relay's token price endpoint.
 */
async function priceTokens(tokens: DustToken[]): Promise<DustToken[]> {
  const results = await Promise.allSettled(
    tokens.map(async (t) => {
      if (t.isNative) {
        // Price native tokens
        const res = await fetch(
          `https://api.relay.link/currencies/token/price?chainId=${t.chainId}&address=0x0000000000000000000000000000000000000000&currency=usd`
        );
        if (!res.ok) return t;
        const data = await res.json();
        const price = data?.price ?? 0;
        const usdValue = price * parseFloat(t.balanceFormatted);
        return { ...t, usdValue };
      } else {
        const res = await fetch(
          `https://api.relay.link/currencies/token/price?chainId=${t.chainId}&address=${t.address}&currency=usd`
        );
        if (!res.ok) return t;
        const data = await res.json();
        const price = data?.price ?? 0;
        const usdValue = price * parseFloat(t.balanceFormatted);
        return { ...t, usdValue };
      }
    })
  );

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : tokens[i]
  );
}
