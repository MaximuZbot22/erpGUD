import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FiltersProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  onClear?: () => void;
  searchPlaceholder?: string;
}

export const Filters: React.FC<FiltersProps> = ({
  fields,
  values,
  onChange,
  onClear,
  searchPlaceholder = 'Search...'
}) => {
  const handleFieldChange = (key: string, value: string) => {
    onChange({
      ...values,
      [key]: value
    });
  };

  const handleClear = () => {
    const cleared: Record<string, string> = {};
    fields.forEach((f) => {
      cleared[f.key] = '';
    });
    if (onClear) {
      onClear();
    } else {
      onChange(cleared);
    }
  };

  const hasActiveFilters = Object.values(values).some((val) => val !== '');

  return (
    <div className="flex flex-wrap items-center gap-3 bg-[#181818] p-3 rounded-xl border border-[#2e2e2e]">
      
      {/* Global Text Search if there's a general field, or render fields */}
      {fields.map((field) => {
        if (field.type === 'text') {
          return (
            <div key={field.key} className="relative min-w-[200px] flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#888888]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={field.placeholder || searchPlaceholder}
                value={values[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-white placeholder-[#888888]"
              />
              {(values[field.key]) && (
                <button
                  onClick={() => handleFieldChange(field.key, '')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#888888] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.key} className="min-w-[140px]">
              <select
                value={values[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-white"
              >
                <option value="">{field.label}</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (field.type === 'date') {
          return (
            <div key={field.key} className="min-w-[140px] flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-[#aaaaaa]">{field.label}:</span>
              <input
                type="date"
                value={values[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="px-2 py-1 text-xs bg-[#121212] border border-[#383838] rounded-lg focus:outline-none focus:border-white text-white"
              />
            </div>
          );
        }

        return null;
      })}

      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClear} 
          className="text-[#aaaaaa] hover:text-white !py-1 text-xs font-semibold"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Reset
        </Button>
      )}
    </div>
  );
};
