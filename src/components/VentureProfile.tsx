import { ArrowRight } from 'lucide-react';
import { Venture } from '../types/venture';

interface VentureProfileProps {
  venture: Venture;
  onContinueToLab: () => void;
  showContinueButton?: boolean;
}

export function VentureProfile({
  venture,
  onContinueToLab,
  showContinueButton = true,
}: VentureProfileProps) {
  return (
    <section
      id="my-selected-venture"
      aria-labelledby="selected-venture-heading"
      className="bg-white border border-blue-600/40 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-3.5 bg-blue-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2
            id="selected-venture-heading"
            className="text-xs font-bold tracking-wider text-blue-700"
          >
            MY SELECTED VENTURE
          </h2>
          <span className="text-xs text-slate-400" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-slate-500">Saved in browser</span>
        </div>

        {showContinueButton && (
          <button
            type="button"
            onClick={onContinueToLab}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <span>Continue to Competition Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="px-5 py-3.5">
          <dt className="text-xs font-medium text-slate-500">Venture name</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
            {venture.name}
          </dd>
        </div>

        <div className="px-5 py-3.5">
          <dt className="text-xs font-medium text-slate-500">Target customer</dt>
          <dd className="mt-1 text-sm text-slate-900 leading-snug">{venture.targetCustomer}</dd>
        </div>

        <div className="px-5 py-3.5">
          <dt className="text-xs font-medium text-slate-500">Problem</dt>
          <dd className="mt-1 text-sm text-slate-900 leading-snug">{venture.problem}</dd>
        </div>

        <div className="px-5 py-3.5">
          <dt className="text-xs font-medium text-slate-500">Geography</dt>
          <dd className="mt-1 text-sm text-slate-900 leading-snug">{venture.geography}</dd>
        </div>

        <div className="px-5 py-3.5">
          <dt className="text-xs font-medium text-slate-500">Offer</dt>
          <dd className="mt-1 text-sm text-slate-900 leading-snug">{venture.offer}</dd>
        </div>
      </dl>
    </section>
  );
}
