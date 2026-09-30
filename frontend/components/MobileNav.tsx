import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { CategoryNode } from '../types';
import { MobileNavPanel } from './MobileNavPanel';
import './MobileNav.css';

// ── Exported types (consumed by MobileNavPanel) ────────────
export type PanelState = 'active' | 'behind' | 'default';

export interface NavNode extends Omit<CategoryNode, 'children'> {
  href: string;
  children?: NavNode[];
}

// ── Internal helpers ───────────────────────────────────────
const enrichNode = (node: CategoryNode): NavNode => ({
  ...node,
  href: `/shop/${encodeURIComponent(node.label)}`,
  children: node.children?.map(enrichNode),
});

/** Collect every node that has children — each needs its own panel. */
const collectPanelNodes = (nodes: NavNode[]): NavNode[] => {
  const acc: NavNode[] = [];
  const visit = (n: NavNode) => {
    if (n.children && n.children.length > 0) {
      acc.push(n);
      n.children.forEach(visit);
    }
  };
  nodes.forEach(visit);
  return acc;
};

// ── Component props ────────────────────────────────────────
export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  categoryTree: CategoryNode[];
  onNavigate: (label: string) => void;
  onShopAll: () => void;
  hamburgerRef?: React.RefObject<HTMLButtonElement | null>;
}

// ── MobileNav ──────────────────────────────────────────────
export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  categoryTree,
  onNavigate,
  onShopAll,
  hamburgerRef,
}) => {
  // Stack of panel IDs. 'root' is the sentinel for the root panel.
  const [stack, setStack] = useState<string[]>(['root']);
  // When true all panels get mn-no-anim to suppress transitions during reset.
  const [noAnim, setNoAnim] = useState(false);

  const drawerRef = useRef<HTMLElement>(null);
  // Stable map of panel ID → ref for that panel's back button.
  const backBtnRefsMap = useRef<Map<string, React.RefObject<HTMLButtonElement | null>>>(
    new Map(),
  );

  const location = useLocation();

  // Enrich category tree once per prop change.
  const rootNodes = useMemo(() => categoryTree.map(enrichNode), [categoryTree]);
  const panelNodes = useMemo(() => collectPanelNodes(rootNodes), [rootNodes]);

  // Get or lazily create a stable ref for a sub-panel's back button.
  const getBackBtnRef = useCallback(
    (id: string): React.RefObject<HTMLButtonElement | null> => {
      if (!backBtnRefsMap.current.has(id)) {
        backBtnRefsMap.current.set(id, React.createRef<HTMLButtonElement | null>());
      }
      return backBtnRefsMap.current.get(id)!;
    },
    [],
  );

  // ── Stack operations ─────────────────────────────────────
  const push = useCallback((id: string) => {
    setStack((prev) => [...prev, id]);
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const reset = useCallback(() => {
    setStack(['root']);
  }, []);

  // ── Panel state derivation ───────────────────────────────
  const getPanelState = useCallback(
    (id: string): PanelState => {
      if (stack[stack.length - 1] === id) return 'active';
      if (stack.includes(id)) return 'behind';
      return 'default';
    },
    [stack],
  );

  // ── Reset to root without animation on open ──────────────
  // useLayoutEffect fires synchronously before paint, so the drawer is still
  // at translateX(-100%) when the panel snap happens — the user never sees it.
  useLayoutEffect(() => {
    if (isOpen) {
      setNoAnim(true);
      reset();
    }
  }, [isOpen, reset]);

  // Re-enable transitions after one paint cycle.
  useEffect(() => {
    if (noAnim) {
      const id = requestAnimationFrame(() => setNoAnim(false));
      return () => cancelAnimationFrame(id);
    }
  }, [noAnim]);

  // ── Focus management ─────────────────────────────────────
  // Move focus to the new panel's back button after push.
  useEffect(() => {
    const topId = stack[stack.length - 1];
    if (topId !== 'root' && isOpen) {
      backBtnRefsMap.current.get(topId)?.current?.focus();
    }
  }, [stack, isOpen]);

  // Return focus to hamburger on close.
  useEffect(() => {
    if (!isOpen) {
      hamburgerRef?.current?.focus();
    }
  }, [isOpen, hamburgerRef]);

  // ── Body scroll lock ─────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ── Close on route change ────────────────────────────────
  useEffect(() => {
    if (isOpen) onClose();
    // Intentionally omitting onClose from deps — we only want this to fire
    // when the pathname changes, not on every render when onClose identity shifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ── Keyboard: Escape ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      stack.length > 1 ? pop() : onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stack, pop, onClose]);

  // ── Swipe right to pop ───────────────────────────────────
  useEffect(() => {
    const el = drawerRef.current;
    if (!el || !isOpen) return;
    let startX = 0;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (dx > 55 && dy < 28) { stack.length > 1 ? pop() : onClose(); }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [isOpen, stack, pop, onClose]);

  // ── Focus trap ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const activePanel = drawerRef.current?.querySelector<HTMLElement>(
        '.mn-panel[data-state="active"]',
      );
      if (!activePanel) return;
      const focusables = Array.from(
        activePanel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* Dim overlay */}
      <div
        className={`mn-overlay${isOpen ? ' mn-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer container */}
      <nav
        ref={drawerRef}
        id="mn-drawer"
        className={`mn-drawer${isOpen ? ' mn-open' : ''}`}
        aria-label="Departments"
        aria-modal="true"
      >
        {/* Root panel */}
        <MobileNavPanel
          id="root"
          label="Departments"
          items={rootNodes}
          isRoot={true}
          state={getPanelState('root')}
          noAnim={noAnim}
          onPush={push}
          onPop={onClose}
          onClose={onClose}
          onShopAll={onShopAll}
        />

        {/* One sub-panel per category node that has children */}
        {panelNodes.map((node) => (
          <MobileNavPanel
            key={node.id}
            id={node.id}
            label={node.label}
            items={node.children ?? []}
            isRoot={false}
            state={getPanelState(node.id)}
            noAnim={noAnim}
            onPush={push}
            onPop={pop}
            onClose={onClose}
            onShopAll={() => {
              onNavigate(node.label);
              onClose();
            }}
            backBtnRef={getBackBtnRef(node.id)}
          />
        ))}
      </nav>
    </>
  );
};
