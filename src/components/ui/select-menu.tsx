import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function SelectMenu({
  value,
  onValueChange,
  placeholder,
  children,
  className,
  disabled,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-lg',
          'border border-white/15 bg-[#0B111B]/80 px-3 text-sm text-white outline-none',
          'focus:border-[#FF6B00]/50 focus:ring-2 focus:ring-[#FF6B00]/35',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        aria-label={placeholder ?? 'Select'}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={8}
          className={cn(
            'z-[60] overflow-hidden rounded-xl',
            'border border-white/15 bg-[#121926]/95 text-white shadow-2xl backdrop-blur',
            'max-h-[min(60vh,360px)] w-[var(--radix-select-trigger-width)]',
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-2 text-muted-foreground">
            <ChevronUp className="h-4 w-4" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1">
            {children}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-2 text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function SelectMenuItem({
  value,
  children,
  className,
  disabled,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-default select-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm outline-none',
        'data-[highlighted]:bg-white/10 data-[highlighted]:text-white',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
    >
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-[#FF6B00]" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

