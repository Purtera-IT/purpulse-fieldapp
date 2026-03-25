/**
 * Standard section card for canonical field v2 — composes fieldVisualTokens.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import {
  FIELD_BODY,
  FIELD_CARD,
  FIELD_CARD_BODY,
  FIELD_CARD_HEADER,
  FIELD_OVERLINE,
  FIELD_SURFACE_MUTED,
  FIELD_SURFACE_WARNING,
} from '@/lib/fieldVisualTokens';

/**
 * @param {Object} props
 * @param {string} [props.title] — overline + optional header band
 * @param {string} [props.description] — support copy below title
 * @param {'default' | 'muted' | 'warning'} [props.variant]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function FieldSectionCard({ title, description, variant = 'default', className, children }) {
  const shell =
    variant === 'muted'
      ? cn(FIELD_SURFACE_MUTED, 'px-4 py-4', className)
      : variant === 'warning'
        ? cn(FIELD_SURFACE_WARNING, 'px-4 py-4', className)
        : cn(FIELD_CARD, 'overflow-hidden', className);

  return (
    <div className={shell}>
      {title && variant === 'default' && (
        <div className={FIELD_CARD_HEADER}>
          <p className={FIELD_OVERLINE}>{title}</p>
          {description ? <p className={cn(FIELD_BODY, 'mt-1.5')}>{description}</p> : null}
        </div>
      )}
      {title && variant !== 'default' && (
        <div className="mb-3 space-y-1">
          <p className={FIELD_OVERLINE}>{title}</p>
          {description ? <p className={FIELD_BODY}>{description}</p> : null}
        </div>
      )}
      {variant === 'default' ? <div className={FIELD_CARD_BODY}>{children}</div> : children}
    </div>
  );
}
