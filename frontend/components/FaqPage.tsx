import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Minus, Plus } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqCategory {
  id: string;
  label: string;
  items: FaqItem[];
}

const CONTACT_EMAIL = "info@belims.co.za";

// Placeholder copy — replace with Site Settings → Ecommerce policies when the final text is ready.
const CATEGORIES: FaqCategory[] = [
  {
    id: "delivery",
    label: "Delivery & collection",
    items: [
      {
        q: "How long does delivery take?",
        a: "Orders placed before 14:00 on a working day are usually dispatched the same day. Delivery times depend on your area and the size of your order.",
      },
      {
        q: "How much does delivery cost?",
        a: "Delivery is calculated at checkout from your address and order weight. Free delivery may apply to qualifying orders.",
      },
      {
        q: "Can I collect my order in store?",
        a: "Yes. Choose collection at checkout, pick your store, and we'll let you know when your order is ready to collect.",
      },
      {
        q: "How do I track my order?",
        a: "Use Track your order in the menu bar with your order number, or sign in to see all your orders in one place.",
      },
    ],
  },
  {
    id: "returns",
    label: "Returns",
    items: [
      {
        q: "What is your returns policy?",
        a: "Unused items in their original packaging can be returned within the return window shown on your order confirmation.",
      },
      {
        q: "How do I start a return?",
        a: "Contact our support team with your order number and the items you want to return. We'll arrange the next steps with you.",
      },
      {
        q: "When will I get my refund?",
        a: "Refunds are issued to your original payment method once the returned items have been received and checked.",
      },
    ],
  },
  {
    id: "warranty",
    label: "Warranty",
    items: [
      {
        q: "Do products come with a warranty?",
        a: "Most power tools and equipment include a manufacturer's warranty. The warranty period is listed on each product page.",
      },
      {
        q: "How do I make a warranty claim?",
        a: "Keep your proof of purchase and contact us with a description of the fault. We'll guide you through the claim.",
      },
      {
        q: "What isn't covered by the warranty?",
        a: "Normal wear and tear, misuse and damage caused by unauthorised repairs are generally not covered.",
      },
    ],
  },
];

const railItemClass = (active: boolean) =>
  `block py-1.5 font-heading text-h5 font-bold transition-colors ${
    active ? "text-text" : "text-text-tertiary hover:text-text"
  }`;

export const FaqPage: React.FC = () => {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set([`${CATEGORIES[0].id}-0`]));

  // Scroll-sync: highlight the category whose section is crossing the upper part of the viewport.
  useEffect(() => {
    const sections = CATEGORIES.map(({ id }) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const toggleItem = (key: string) =>
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="bg-surface-muted">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow font-semibold text-primary">Help centre</p>
          <h1 className="mt-1 font-heading text-h2 font-bold uppercase font-condensed text-text">
            We've got answers
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            Quick answers about delivery, returns and warranty. Can't find what you need? Email us and we'll help.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-8 md:mt-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="FAQ categories" className="lg:sticky lg:top-40 lg:self-start">
            <ul className="flex flex-wrap gap-x-6 gap-y-1 lg:block">
              {CATEGORIES.map(({ id, label }) => (
                <li key={id}>
                  <Link to={`#${id}`} aria-current={activeId === id ? "true" : undefined} className={railItemClass(activeId === id)}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={`${railItemClass(false)} inline-flex items-center gap-1.5`}>
                  Contact
                  <ArrowUpRight size={18} aria-hidden />
                </a>
              </li>
            </ul>
          </nav>

          <div className="space-y-10">
            {CATEGORIES.map(({ id, label, items }) => (
              <section key={id} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-40">
                <h2 id={`${id}-title`} className="sr-only">
                  {label}
                </h2>
                <div className="rounded-lg border-2 border-border bg-white">
                  {items.map(({ q, a }, index) => {
                    const key = `${id}-${index}`;
                    const isOpen = openItems.has(key);
                    return (
                      <div key={key} className="border-b border-border last:border-b-0">
                        <h3>
                          <button
                            type="button"
                            id={`faq-${key}`}
                            aria-expanded={isOpen}
                            aria-controls={`faq-${key}-panel`}
                            onClick={() => toggleItem(key)}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-bold text-text transition-colors hover:text-belims-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-belims-blue"
                          >
                            {q}
                            {isOpen ? <Minus size={18} className="flex-shrink-0" aria-hidden /> : <Plus size={18} className="flex-shrink-0" aria-hidden />}
                          </button>
                        </h3>
                        {isOpen && (
                          <div id={`faq-${key}-panel`} role="region" aria-labelledby={`faq-${key}`} className="px-5 pb-5 text-base leading-relaxed text-text-secondary">
                            {a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
