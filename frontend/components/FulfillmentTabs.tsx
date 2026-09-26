import React from "react";

export type FulfillmentTab = "pickup" | "delivery";

interface FulfillmentTabsProps {
  value: FulfillmentTab;
  onChange: (tab: FulfillmentTab) => void;
  pickupPanelId: string;
  deliveryPanelId: string;
}

const TAB_ORDER: FulfillmentTab[] = ["pickup", "delivery"];

export const FulfillmentTabs: React.FC<FulfillmentTabsProps> = ({
  value,
  onChange,
  pickupPanelId,
  deliveryPanelId,
}) => {
  const pickupTabId = `${pickupPanelId}-tab`;
  const deliveryTabId = `${deliveryPanelId}-tab`;

  const getNextTab = (
    current: FulfillmentTab,
    direction: "left" | "right",
  ): FulfillmentTab => {
    const index = TAB_ORDER.indexOf(current);
    if (direction === "right") {
      return TAB_ORDER[(index + 1) % TAB_ORDER.length];
    }
    return TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length];
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: FulfillmentTab,
  ) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onChange(getNextTab(current, "right"));
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChange(getNextTab(current, "left"));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(current);
    }
  };

  const baseClass =
    "pb-2 text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-strong";

  return (
    <div
      className="border-b border-border"
      role="tablist"
      aria-label="Fulfillment options"
    >
      <div className="flex items-center gap-8">
        <button
          id={pickupTabId}
          type="button"
          role="tab"
          aria-selected={value === "pickup"}
          aria-controls={pickupPanelId}
          onClick={() => onChange("pickup")}
          onKeyDown={(event) => handleTabKeyDown(event, "pickup")}
          className={`${baseClass} ${
            value === "pickup"
              ? "font-semibold text-text border-b-2 border-border-strong"
              : "font-medium text-text-tertiary hover:text-text"
          }`}
        >
          Pickup
        </button>
        <button
          id={deliveryTabId}
          type="button"
          role="tab"
          aria-selected={value === "delivery"}
          aria-controls={deliveryPanelId}
          onClick={() => onChange("delivery")}
          onKeyDown={(event) => handleTabKeyDown(event, "delivery")}
          className={`${baseClass} ${
            value === "delivery"
              ? "font-semibold text-text border-b-2 border-border-strong"
              : "font-medium text-text-tertiary hover:text-text"
          }`}
        >
          Delivery
        </button>
      </div>
    </div>
  );
};
