import { useRef, useState, type ReactNode } from 'react';
import { LogIn } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { chromeText } from '@/shell/chromeUi';
import { AuthPopover } from './AuthPopover';

type ProductAuthFeature = {
  icon: ReactNode;
  label: string;
};

export function ProductAuthGate({
  variant,
  icon,
  eyebrow,
  title,
  lede,
  features,
  preview,
}: {
  variant: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  lede: string;
  features: ProductAuthFeature[];
  preview: ReactNode;
}) {
  const signInRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`product-auth-gate product-auth-gate--${variant} relative isolate flex min-h-full items-center justify-center overflow-hidden px-4 py-10`}
      aria-labelledby={`product-auth-gate-${variant}-title`}
    >
      <div className="product-auth-gate__glow product-auth-gate__glow--one" aria-hidden="true" />
      <div className="product-auth-gate__glow product-auth-gate__glow--two" aria-hidden="true" />
      <div className="product-auth-gate__card shadow-theme-xl">
        <div className="product-auth-gate__copy">
          <div className="product-auth-gate__icon">{icon}</div>
          <span className="product-auth-gate__eyebrow">{eyebrow}</span>
          <h2 id={`product-auth-gate-${variant}-title`}>{title}</h2>
          <p className={cn('product-auth-gate__lede', chromeText.base)}>{lede}</p>
          <div className="product-auth-gate__features">
            {features.map((feature) => (
              <div key={feature.label}>
                {feature.icon}
                <span>{feature.label}</span>
              </div>
            ))}
          </div>
          <button
            ref={signInRef}
            type="button"
            onClick={() => setOpen(true)}
            className="product-auth-gate__cta shadow-theme-sm transition hover:-translate-y-0.5 hover:shadow-theme-md"
          >
            <LogIn className="h-4 w-4" />
            Sign in to get started
          </button>
        </div>
        <div className="product-auth-gate__preview" aria-hidden="true">
          {preview}
        </div>
      </div>
      <AuthPopover open={open} onOpenChange={setOpen} anchorRef={signInRef} />
    </section>
  );
}
