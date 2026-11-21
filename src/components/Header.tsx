import { Layers, RotateCcw } from 'lucide-react';
import { Venture } from '../types/venture';

interface HeaderProps {
  selectedVenture: Venture | null;
  activeView: 'venture-bank' | 'competition-lab';
  onBackToBank: () => void;
  onClearSelection: () => void;
}

export function Header({
  selectedVenture,
  activeView,
  onBackToBank,
  onClearSelection,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            NEXUS Venture Studio
          </span>
        </div>

        <nav
          aria-label="Primary studio navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={onBackToBank}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'venture-bank'
                ? 'text-slate-900 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Venture Bank
          </button>
          <a
            href="#journey-stages"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Journey Stages
          </a>
          {selectedVenture && (
            <a
              href="#my-selected-venture"
              onClick={onBackToBank}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              My Selected Venture
            </a>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {selectedVenture ? (
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Selection</span>
            </button>
          ) : (
            <a
              href="#venture-bank"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              Select Venture
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
