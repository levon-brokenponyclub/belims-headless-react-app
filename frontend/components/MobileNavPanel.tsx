import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  backBtnRef?: React.RefObject<HTMLButtonElement | null>;
}

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
        <div className="flex-shrink-0 flex items-center h-14 border-b border-border bg-surface">
          {isRoot ? (
            <>
              <span className="flex-1 pl-4 font-bold text-base font-heading text-text">
                Departments
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-14 h-14 flex items-center justify-center text-text-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                aria-label="Close menu"
              >
                <X size={20} aria-hidden />
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
            className="w-full flex items-center gap-1.5 min-h-12 px-4 text-sm font-semibold text-primary hover:bg-surface-muted transition-colors"
          >
            {isRoot ? 'Shop All' : `Shop all ${label}`}
            <ChevronRight size={13} aria-hidden />
          </button>
          <hr className="border-border" />

          {/* Category list */}
          <ul>
            {items.map((item) => {
              const hasSubs = Boolean(item.children && item.children.length > 0);
              return (
                <li key={item.id}>
                  {hasSubs ? (
                    <button
                      type="button"
                      onClick={() => onPush(item.id)}
                      className="w-full flex items-center justify-between px-4 min-h-[52px] py-2.5 font-bold text-sm text-text border-b border-border hover:bg-surface-muted transition-colors"
                    >
                      <span>{item.label}</span>
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
                      className="flex items-center px-4 min-h-[52px] py-2.5 font-bold text-sm text-text border-b border-border hover:bg-surface-muted transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="h-8" aria-hidden />
        </div>
      </div>
    );
  },
);

MobileNavPanel.displayName = 'MobileNavPanel';
