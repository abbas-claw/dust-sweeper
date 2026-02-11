'use client';

import { useState } from 'react';
import { type Address } from 'viem';
import { useWalletClient } from 'wagmi';
import type { DustToken } from '@/lib/tokens';
import { getRelayQuote } from '@/lib/relay';

interface Props {
  tokens: DustToken[];
  wallet: Address;
}

interface SweepStatus {
  key: string;
  state: 'pending' | 'quoting' | 'approving' | 'sweeping' | 'done' | 'error';
  message: string;
  txHash?: string;
}

const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

export function SweepPanel({ tokens, wallet }: Props) {
  const { data: walletClient } = useWalletClient();
  const [statuses, setStatuses] = useState<Map<string, SweepStatus>>(new Map());
  const [sweeping, setSweeping] = useState(false);

  const totalUsd = tokens.reduce((sum, t) => sum + (t.usdValue ?? 0), 0);

  const updateStatus = (key: string, update: Partial<SweepStatus>) => {
    setStatuses((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) || {
        key,
        state: 'pending' as const,
        message: '',
      };
      next.set(key, { ...existing, ...update });
      return next;
    });
  };

  const sweep = async () => {
    if (!walletClient) return;
    setSweeping(true);

    for (const token of tokens) {
      const key = `${token.chainId}:${token.address}`;

      try {
        // Get quote
        updateStatus(key, { state: 'quoting', message: 'Getting quote...' });

        const quote = await getRelayQuote({
          user: wallet,
          originChainId: token.chainId,
          originCurrency: token.address,
          destinationChainId: token.chainId,
          destinationCurrency: NATIVE_ADDRESS,
          amount: token.balance.toString(),
        });

        if (!quote.steps || quote.steps.length === 0) {
          updateStatus(key, { state: 'error', message: 'No route found' });
          continue;
        }

        // Execute each step
        for (const step of quote.steps) {
          for (const item of step.items) {
            if (item.status === 'incomplete' && item.data) {
              updateStatus(key, {
                state: 'sweeping',
                message: `Executing ${step.action}...`,
              });

              const txHash = await walletClient.sendTransaction({
                to: item.data.to as Address,
                data: item.data.data as `0x${string}`,
                value: BigInt(item.data.value || '0'),
                chain: undefined,
                account: wallet,
              });

              updateStatus(key, {
                state: 'done',
                message: 'Swept!',
                txHash,
              });
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed';
        updateStatus(key, { state: 'error', message: msg });
      }
    }

    setSweeping(false);
  };

  return (
    <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Sweep {tokens.length} tokens</h3>
          <p className="text-sm text-white/50">
            ~${totalUsd.toFixed(2)} total value → native gas token
          </p>
        </div>
        <button
          onClick={sweep}
          disabled={sweeping || !walletClient}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 rounded-lg font-medium transition-colors"
        >
          {sweeping ? 'Sweeping...' : 'Sweep Selected'}
        </button>
      </div>

      {/* Status list */}
      {statuses.size > 0 && (
        <div className="space-y-2 mt-4">
          {tokens.map((t) => {
            const key = `${t.chainId}:${t.address}`;
            const status = statuses.get(key);
            if (!status) return null;

            return (
              <div
                key={key}
                className="flex items-center justify-between text-sm px-3 py-2 bg-white/5 rounded-lg"
              >
                <span>
                  {t.symbol}
                  <span className="text-white/30 ml-1">on {t.chainName}</span>
                </span>
                <span
                  className={
                    status.state === 'done'
                      ? 'text-green-400'
                      : status.state === 'error'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                  }
                >
                  {status.message}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-white/30">
        Each token requires a separate transaction. You will be prompted to approve each one.
        Relay handles the swap routing. Gas fees apply per transaction.
      </p>
    </div>
  );
}
