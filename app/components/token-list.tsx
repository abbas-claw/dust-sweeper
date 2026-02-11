'use client';

import type { DustToken } from '@/lib/tokens';
import { CHAIN_BY_ID } from '@/lib/chains';

interface Props {
  tokens: DustToken[];
  selected?: Set<string>;
  onToggle?: (key: string) => void;
}

export function TokenList({ tokens, selected, onToggle }: Props) {
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/5 text-white/50 text-left">
            {onToggle && <th className="px-4 py-3 w-10"></th>}
            <th className="px-4 py-3">Token</th>
            <th className="px-4 py-3">Chain</th>
            <th className="px-4 py-3 text-right">Balance</th>
            <th className="px-4 py-3 text-right">USD Value</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => {
            const key = `${t.chainId}:${t.address}`;
            const isSelected = selected?.has(key);

            return (
              <tr
                key={key}
                className={`border-t border-white/5 hover:bg-white/5 transition-colors ${
                  isSelected ? 'bg-blue-500/5' : ''
                }`}
                onClick={() => onToggle?.(key)}
                style={{ cursor: onToggle ? 'pointer' : 'default' }}
              >
                {onToggle && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected || false}
                      onChange={() => onToggle(key)}
                      className="accent-blue-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {t.logoURI && (
                      <img
                        src={t.logoURI}
                        alt=""
                        className="w-6 h-6 rounded-full bg-white/10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <span className="font-medium">{t.symbol}</span>
                      <span className="ml-2 text-white/30 text-xs">
                        {t.name}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">{t.chainName}</td>
                <td className="px-4 py-3 text-right font-mono text-white/80">
                  {formatBalance(t.balanceFormatted)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {t.usdValue !== null ? (
                    <span className={t.usdValue < 1 ? 'text-white/40' : ''}>
                      ${t.usdValue.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatBalance(val: string): string {
  const num = parseFloat(val);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
