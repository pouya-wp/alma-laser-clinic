import React from 'react';
import { Sparkles, Check, Clock } from 'lucide-react';
import { ServicePackage } from '../lib/types';
import { formatToman } from '../lib/jalali';

interface BodyMapSelectorProps {
  packages: ServicePackage[];
  selectedPackageId: string;
  onSelectPackage: (pkg: ServicePackage) => void;
  genderFilter: 'FEMALE' | 'MALE';
  onGenderChange: (gender: 'FEMALE' | 'MALE') => void;
}

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  packages,
  selectedPackageId,
  onSelectPackage,
  genderFilter,
  onGenderChange,
}) => {
  const filtered = packages.filter(
    (p) => p.gender === genderFilter || p.gender === 'UNISEX'
  );

  return (
    <div className="space-y-4">
      {/* Gender Switcher Tabs */}
      <div className="flex bg-obsidian-900/90 p-1 rounded-2xl border border-white/10 max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => onGenderChange('FEMALE')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            genderFilter === 'FEMALE'
              ? 'bg-gradient-to-r from-alma-600 to-alma-500 text-white shadow-glow-alma'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🌸 خدمات بانوان
        </button>
        <button
          type="button"
          onClick={() => onGenderChange('MALE')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            genderFilter === 'MALE'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ⚡ خدمات آقایان
        </button>
      </div>

      {/* Package Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          return (
            <div
              key={pkg.id}
              onClick={() => onSelectPackage(pkg)}
              className={`relative cursor-pointer rounded-2xl p-4 transition-all duration-300 border ${
                isSelected
                  ? 'glass-card border-alma-500 ring-2 ring-alma-500/50 shadow-glow-alma transform -translate-y-1'
                  : 'bg-obsidian-900/60 border-white/10 hover:border-alma-500/30 hover:bg-obsidian-850'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-alma-500 flex items-center justify-center text-white shadow-md">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-1.5">
                    {pkg.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-alma-400" />
                      {pkg.durationMinutes} دقیقه
                    </span>
                    <span className="text-white/20">•</span>
                    <span className="text-emerald-400 font-medium">کندلا اصل ۲۰۲۴</span>
                  </div>
                </div>
              </div>

              {pkg.description && (
                <p className="text-xs text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
                  {pkg.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-400">تعرفه جلسه:</span>
                <span className="font-extrabold text-base text-alma-300 tracking-tight">
                  {formatToman(pkg.price)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
