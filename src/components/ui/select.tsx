import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils/cn';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'defaultValue'> {
  label?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, value, defaultValue, onValueChange, placeholder, disabled, ...props }, ref) => {
    // Compatibility wrapper: keep the old API shape, but render a Radix select for mobile.
    // We can't forward the ref to a native <select> anymore; keep it attached to a hidden select for forms.
    const id = useId();
    const selectId = props.id ?? `select-${id}`;

    // Extract options from children (<option value="...">Label</option>)
    const items: Array<{ value: string; label: string; disabled?: boolean }> = [];
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach((c: any) => {
      if (!c) return;
      if (c.type === 'option') {
        items.push({ value: String(c.props.value ?? ''), label: String(c.props.children ?? ''), disabled: !!c.props.disabled });
      }
    });

    const controlledValue = value ?? defaultValue ?? '';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-slate-400 mb-1.5">
            {label}
          </label>
        )}

        {/* Hidden native select for compatibility (forms/autofill) */}
        <select
          ref={ref}
          id={selectId}
          className="sr-only"
          value={controlledValue}
          disabled={disabled}
          readOnly
          aria-hidden="true"
          tabIndex={-1}
          {...props}
        >
          {children}
        </select>

        <SelectMenu
          value={controlledValue}
          onValueChange={onValueChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'h-9 bg-slate-800 border border-slate-700 text-sm text-slate-100',
            error && 'border-red-500',
            className,
          )}
        >
          {items.map((it) => (
            <SelectMenuItem key={it.value || it.label} value={it.value} disabled={it.disabled}>
              {it.label}
            </SelectMenuItem>
          ))}
        </SelectMenu>

        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';