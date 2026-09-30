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

interface CategoryMeta {
  icon: LucideIcon;
  hint: string;
}

// Icon + hint mapped by lowercase category label. Falls back gracefully for unknown categories.
const CATEGORY_META: Record<string, CategoryMeta> = {
  'doors and windows':          { icon: Home,     hint: 'Interior, Exterior, Security' },
  'fasteners and adhesives':    { icon: Wrench,   hint: 'Screws, Bolts, Sealants' },
  'outdoor garden and patio':   { icon: Leaf,     hint: 'Tools, Furniture, Irrigation' },
  'paint':                      { icon: Palette,  hint: 'Interior, Exterior, Primers' },
  'safety and protective wear': { icon: Shield,   hint: 'PPE, Helmets, Gloves, Hi-Vis' },
  'security and smart home':    { icon: Lock,     hint: 'Locks, CCTV, Alarms, Gates' },
  'tools and machinery':        { icon: Hammer,   hint: 'Power, Hand & Measuring' },
  'water tanks and filtration': { icon: Droplets, hint: 'Tanks, Pumps, Filters' },
};

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
            isRoot ? 'bg-primary text-white' : 'border-b border-border bg-surface'
          }`}
        >
          {isRoot ? (
            <>
              <span className="flex-1 pl-4 font-bold text-base font-heading">
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
              <span className="flex-1 min-w-0 font-bold text-base font-heading text-text truncate pr-4">
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
            className="w-full flex items-center gap-1.5 min-h-12 px-4 text-left text-sm font-semibold text-primary hover:bg-surface-muted transition-colors"
          >
            {isRoot ? 'Shop All' : `Shop all ${label}`}
            <ChevronRight size={13} aria-hidden />
          </button>
          <hr className="border-border" />

          {/* Category list */}
          <ul>
            {items.map((item) => {
              const hasSubs = Boolean(item.children && item.children.length > 0);
              const meta = isRoot ? CATEGORY_META[item.label.toLowerCase()] : undefined;
              const Icon = meta?.icon;

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
                      <span className={`flex-1 min-w-0 ${isRoot && meta?.hint ? 'flex flex-col' : ''}`}>
                        <span className="font-bold text-sm leading-tight block">{item.label}</span>
                        {isRoot && meta?.hint && (
                          <span className="text-xs text-text-tertiary leading-tight mt-0.5 block">
                            {meta.hint}
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
                      className={`flex items-center gap-3.5 px-4 font-bold text-sm text-text border-b border-border hover:bg-surface-muted transition-colors ${
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
                    className="flex items-center gap-3.5 px-4 min-h-[52px] text-sm font-semibold text-text border-b border-border hover:bg-surface-muted transition-colors"
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
                    className="w-full flex items-center gap-3.5 px-4 min-h-[52px] text-left text-sm font-semibold text-text border-b border-border hover:bg-surface-muted transition-colors"
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
                    className="w-full flex items-center gap-3.5 px-4 min-h-[52px] text-left text-sm font-semibold text-text border-b border-border hover:bg-surface-muted transition-colors"
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
