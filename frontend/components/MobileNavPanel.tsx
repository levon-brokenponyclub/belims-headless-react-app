import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  Wrench,
  Leaf,
  Palette,
  Shield,
  Lock,
  Hammer,
  Droplets,
  Star,
  MapPin,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { NavNode, PanelState } from './MobileNav';

export interface MobileNavPanelProps {
  id: string;
  label: string;
  items: NavNode[];
  isRoot: boolean;
  state: PanelState;
  noAnim: boolean;
  onPush: (id: string) => void;
  onPop: () => void;
  onClose: () => void;
  onShopAll: () => void;
  onOpenStoreLocator?: () => void;
  onOpenAccount?: () => void;
  backBtnRef?: React.RefObject<HTMLButtonElement | null>;
}

// Department icons by lowercase label; unknown departments render without an icon.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'doors and windows': Home,
  'fasteners and adhesives': Wrench,
  'outdoor garden and patio': Leaf,
  'paint': Palette,
  'safety and protective wear': Shield,
  'security and smart home': Lock,
  'tools and machinery': Hammer,
  'water tanks and filtration': Droplets,
};

// Hint = first three real subcategories, so it never promises ranges we don't stock.
const hintFor = (item: NavNode) =>
  (item.children ?? []).slice(0, 3).map((c) => c.label).join(', ');

export const MobileNavPanel = React.memo<MobileNavPanelProps>(
  ({
    id,
    label,
    items,
    isRoot,
    state,
    noAnim,
    onPush,
    onPop,
    onClose,
    onShopAll,
    onOpenStoreLocator,
    onOpenAccount,
    backBtnRef,
  }) => {
    const panelClass = ['mn-panel', noAnim ? 'mn-no-anim' : '']
      .filter(Boolean)
      .join(' ');

    return (
      <div
        id={`mn-panel-${id}`}
        className={panelClass}
        data-state={state}
        aria-hidden={state !== 'active'}
        {...(state !== 'active' ? { inert: true } : {})}
      >
        {/* ── Panel header ─────────────────────────────── */}
        <div
          className={`flex-shrink-0 flex items-center h-14 ${
            isRoot ? 'border-b-4 border-primary bg-belims-blue text-white' : 'border-b border-border bg-surface'
          }`}
        >
          {isRoot ? (
            <>
              <span className="flex-1 pl-4 font-heading text-h5 font-bold uppercase font-condensed">
                Departments
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-14 h-14 flex items-center justify-center hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
                aria-label="Close menu"
              >
                <X size={18} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button
                ref={backBtnRef}
                type="button"
                onClick={onPop}
                className="w-14 h-14 flex items-center justify-center flex-shrink-0 text-text-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                aria-label="Back"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
              <span className="flex-1 min-w-0 truncate pr-4 font-heading text-h5 font-bold uppercase font-condensed text-text">
                {label}
              </span>
            </>
          )}
        </div>

        {/* ── Scrollable body ───────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Shop All / Shop all {Category} */}
          <button
            type="button"
            onClick={onShopAll}
            className="w-full flex items-center gap-1.5 min-h-12 px-4 text-left text-base font-bold text-primary hover:bg-surface-muted transition-colors"
          >
            {isRoot ? 'Shop All' : `Shop all ${label}`}
            <ChevronRight size={13} aria-hidden />
          </button>
          <hr className="border-border" />

          {/* Category list */}
          <ul>
            {items.map((item) => {
              const hasSubs = Boolean(item.children && item.children.length > 0);
              const Icon = isRoot ? CATEGORY_ICONS[item.label.toLowerCase()] : undefined;
              const hint = isRoot ? hintFor(item) : '';

              return (
                <li key={item.id}>
                  {hasSubs ? (
                    <button
                      type="button"
                      onClick={() => onPush(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4 text-left text-text border-b border-border hover:bg-surface-muted transition-colors ${
                        isRoot ? 'min-h-14 py-3' : 'min-h-[52px] py-2.5 justify-between'
                      }`}
                    >
                      {isRoot && Icon && (
                        <span
                          className="flex-shrink-0 text-primary flex items-center justify-center w-5 h-5"
                          aria-hidden
                        >
                          <Icon size={20} />
                        </span>
                      )}
                      <span className={`flex-1 min-w-0 ${hint ? 'flex flex-col' : ''}`}>
                        <span className="font-bold text-base leading-tight block">{item.label}</span>
                        {hint && (
                          <span className="text-sm text-text-tertiary leading-tight mt-0.5 block truncate">
                            {hint}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-text-secondary flex-shrink-0"
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3.5 px-4 font-bold text-base text-text border-b border-border hover:bg-surface-muted transition-colors ${
                        isRoot ? 'min-h-14 py-3' : 'min-h-[52px] py-2.5'
                      }`}
                    >
                      {isRoot && Icon && (
                        <span
                          className="flex-shrink-0 text-primary flex items-center justify-center w-5 h-5"
                          aria-hidden
                        >
                          <Icon size={20} />
                        </span>
                      )}
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Root-only: utility quick-links */}
          {isRoot && (
            <>
              <hr className="border-border mt-1" />
              <ul>
                <li>
                  <Link
                    to="/shop"
                    onClick={onClose}
                    className="flex items-center gap-3.5 px-4 min-h-[52px] text-base font-semibold text-text border-b border-border hover:bg-surface-muted transition-colors"
                  >
                    <Star
                      size={18}
                      className="flex-shrink-0 text-text-secondary"
                      aria-hidden
                    />
                    Specials
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenStoreLocator?.();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3.5 px-4 min-h-[52px] text-left text-base font-semibold text-text border-b border-border hover:bg-surface-muted transition-colors"
                  >
                    <MapPin
                      size={18}
                      className="flex-shrink-0 text-text-secondary"
                      aria-hidden
                    />
                    Store Locator
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAccount?.();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3.5 px-4 min-h-[52px] text-left text-base font-semibold text-text border-b border-border hover:bg-surface-muted transition-colors"
                  >
                    <User
                      size={18}
                      className="flex-shrink-0 text-text-secondary"
                      aria-hidden
                    />
                    My Account
                  </button>
                </li>
              </ul>
            </>
          )}

          <div className="h-8" aria-hidden />
        </div>
      </div>
    );
  },
);

MobileNavPanel.displayName = 'MobileNavPanel';
