import { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { VENTURE_BANK } from '../data/ventures';
import { Venture } from '../types/venture';

interface VentureBankProps {
  selectedVentureId: string | null;
  onSelectVenture: (venture: Venture) => void;
}

export function VentureBank({ selectedVentureId, onSelectVenture }: VentureBankProps) {
  const [query, setQuery] = useState('');

  const filteredVentures = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return VENTURE_BANK;
    }
    return VENTURE_BANK.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.targetCustomer.toLowerCase().includes(q) ||
        v.geography.toLowerCase().includes(q) ||
        v.problem.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <section id="venture-bank" aria-labelledby="venture-bank-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 id="venture-bank-heading" className="text-base sm:text-lg font-semibold text-slate-900">
            Venture Bank
          </h2>
          <span className="font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap">
            {filteredVentures.length} / {VENTURE_BANK.length} ventures
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter ventures..."
            aria-label="Filter ventures"
            className="w-full pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
          />
        </div>
      </div>

      {filteredVentures.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-900">No matching ventures</p>
          <p className="text-xs text-slate-500 mt-1">
            Clear the filter to view all 10 ventures.
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredVentures.map((venture) => {
            const isSelected = venture.id === selectedVentureId;

            return (
              <div
                key={venture.id}
                onClick={() => onSelectVenture(venture)}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug truncate">
                    {venture.name}
                  </h3>
                  <p className="text-xs text-slate-700 truncate">
                    <span className="text-slate-500">Customer:</span> {venture.targetCustomer}
                  </p>
                  <p className="text-xs text-slate-600 truncate" title={venture.problem}>
                    {venture.problem}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    <span className="text-slate-400">Geography:</span> {venture.geography}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVenture(venture);
                  }}
                  aria-pressed={isSelected}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Selected</span>
                    </>
                  ) : (
                    <span>Select Venture</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
