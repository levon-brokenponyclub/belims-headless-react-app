import React from "react";
import { ChatMessage } from "../types.ts";
import { ChatProductCard } from "./ChatProductCard";

interface ChatMessageItemProps {
  message: ChatMessage;
  onAddToCart: (productId: string) => void;
  onBuyNow: (productId: string) => void;
  onCheckStock: (productId: string) => void;
  onEditFinderAnswers: () => void;
  onDecisionOptionSelect: (value: string) => void;
  onEditDecisionAnswers: () => void;
  onCompareShortlist: () => void;
  onOpenDeliveryLocation: () => void;
  onOpenDeliveryOptions: () => void;
  onPdpAction: (
    action: "check_stock" | "delivery_options",
    productId: string,
  ) => void;
  onActionChip: (
    action:
      | { type: "add_to_cart"; productId: string; label: string }
      | { type: "find_alternatives"; productId: string; label: string },
  ) => void;
  showProductsInChat?: boolean;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onAddToCart,
  onBuyNow,
  onCheckStock,
  onEditFinderAnswers,
  onDecisionOptionSelect,
  onEditDecisionAnswers,
  onCompareShortlist,
  onOpenDeliveryLocation,
  onOpenDeliveryOptions,
  onPdpAction,
  onActionChip,
  showProductsInChat = true,
}) => {
  const isAssistant = message.role === "assistant" || message.role === "system";
  const showProducts =
    showProductsInChat &&
    (isAssistant || message.role === "tool") &&
    !!message.meta?.products &&
    message.meta.products.length > 0;

  const sanitizeDecisionField = (value?: string): string | undefined => {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes(":")) {
      return undefined;
    }
    return trimmed;
  };

  const decisionSummary = message.meta?.decision?.summary;
  const summaryUseCase = sanitizeDecisionField(
    decisionSummary?.categoryOrUseCase,
  );
  const summaryBudget = sanitizeDecisionField(decisionSummary?.budget?.raw);
  const summaryPreference = sanitizeDecisionField(decisionSummary?.preference);
  const summaryFocus = sanitizeDecisionField(decisionSummary?.compareFocus);
  const summaryUsage =
    decisionSummary?.usage === "business"
      ? "Business"
      : decisionSummary?.usage === "home"
        ? "Home"
        : undefined;

  return (
    <div
      className={`mb-5 flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
      style={{ animation: "chatFadeIn 150ms ease-out" }}
    >
      <div
        className={`max-w-[min(92%,680px)] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-sm border ${
          isAssistant
            ? "bg-violet-50/80 text-gray-800 rounded-tl-none border-violet-100"
            : "bg-white text-gray-800 rounded-tr-none border-gray-200 shadow-md"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {isAssistant && message.meta?.finderQuestion && (
        <div className="mt-2 w-full bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-900">
          <div className="text-xs uppercase tracking-wide font-semibold mb-1">
            Finder question
          </div>
          <div>{message.meta.finderQuestion.text}</div>
        </div>
      )}

      {isAssistant && message.meta?.finderSummary && (
        <div className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
          <div className="font-semibold mb-1">Finder summary</div>
          <div className="text-xs text-slate-600">
            <div>
              Use case: {message.meta.finderSummary.useCase ?? "Not provided"}
            </div>
            <div>
              Budget: {message.meta.finderSummary.budget ?? "No preference"}
            </div>
            <div>
              Preferences:{" "}
              {message.meta.finderSummary.preferences ?? "No preference"}
            </div>
            <div>Usage: {summaryUsage ?? "No preference"}</div>
          </div>
          <button
            onClick={onEditFinderAnswers}
            className="mt-2 text-xs bg-white border border-slate-300 rounded px-2 py-1 hover:bg-slate-100"
          >
            Edit answers
          </button>
        </div>
      )}

      {isAssistant && message.meta?.decision?.question && (
        <div className="mt-2 w-full bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-sm text-violet-900">
          <div className="text-xs uppercase tracking-wide font-semibold mb-1">
            Decision question
          </div>
          <div>{message.meta.decision.question.text}</div>

          {!!message.meta.decision.question.options?.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.meta.decision.question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onDecisionOptionSelect(option)}
                  className="text-xs rounded-full border border-violet-200 bg-white px-2.5 py-1 hover:bg-violet-100"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isAssistant && message.meta?.decision?.summary && (
        <div className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800">
          <div className="font-semibold mb-1">Decision summary</div>
          <div className="text-xs text-slate-600 space-y-0.5">
            <div>
              Use case:{" "}
              {message.meta.decision.summary.categoryOrUseCase ??
                "Not provided"}
            </div>
            <div>
              Budget:{" "}
              {message.meta.decision.summary.budget?.raw ?? "No preference"}
            </div>
            <div>
              Preference:{" "}
              {message.meta.decision.summary.preference ?? "No preference"}
            </div>
            <div>
              Focus:{" "}
              {message.meta.decision.summary.compareFocus ?? "best_value"}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              onClick={onEditDecisionAnswers}
              className="text-xs bg-white border border-slate-300 rounded px-2 py-1 hover:bg-slate-100"
            >
              Edit
            </button>
            <button
              onClick={onCompareShortlist}
              className="text-xs bg-white border border-slate-300 rounded px-2 py-1 hover:bg-slate-100"
            >
              Compare
            </button>
            {message.meta.decision.bestFitProductId && (
              <>
                <button
                  onClick={() =>
                    onCheckStock(message.meta?.decision?.bestFitProductId ?? "")
                  }
                  className="text-xs bg-white border border-slate-300 rounded px-2 py-1 hover:bg-slate-100"
                >
                  Check stock
                </button>
                <button
                  onClick={() =>
                    onBuyNow(message.meta?.decision?.bestFitProductId ?? "")
                  }
                  className="text-xs bg-violet-700 text-white border border-violet-700 rounded px-2 py-1 hover:bg-violet-800"
                >
                  Buy now
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isAssistant && message.meta?.pdpContext && (
        <div className="mt-2 w-full bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-sm text-violet-900">
          <div className="font-semibold">PDP context</div>
          <div className="text-xs mt-1">
            You’re viewing {message.meta.pdpContext.title}. Want stock and
            delivery clarity before checkout?
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(message.meta.pdpActions ?? []).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() =>
                  onPdpAction(action, message.meta?.pdpContext?.productId ?? "")
                }
                className="text-xs rounded-full border border-violet-200 bg-white px-2.5 py-1 hover:bg-violet-100"
              >
                {action === "check_stock" ? "Check stock" : "Delivery options"}
              </button>
            ))}
          </div>
        </div>
      )}

      {isAssistant && message.meta?.actionChips?.length ? (
        <div className="mt-2 w-full flex flex-wrap gap-1.5">
          {message.meta.actionChips.map((action) => (
            <button
              key={`${action.type}-${action.productId}`}
              type="button"
              onClick={() => onActionChip(action)}
              className="text-xs rounded-full border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-100"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {showProducts && (
        <div className="flex overflow-x-auto gap-3 w-full pb-4 px-1 snap-x scrollbar-hide mt-2">
          {message.meta?.products?.map((p) => (
            <div key={p.id} className="snap-center flex-shrink-0">
              <ChatProductCard
                product={p}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                onCheckStock={onCheckStock}
                highlight={Boolean(p.isBestFit)}
                deliveryLocationSet={Boolean(
                  message.meta?.fulfillment?.deliveryLocationSet,
                )}
                onRequestDeliveryAddress={
                  message.meta?.fulfillment?.deliveryLocationSet
                    ? onOpenDeliveryOptions
                    : onOpenDeliveryLocation
                }
              />
            </div>
          ))}
        </div>
      )}

      {isAssistant && message.meta?.inventory && (
        <div className="mt-2 w-full bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-sm text-teal-900">
          <div className="font-semibold">Inventory status</div>
          <div>
            Level: {message.meta.inventory.level.replace(/_/g, " ")}
            {typeof message.meta.inventory.qty === "number"
              ? ` (${message.meta.inventory.qty} available)`
              : ""}
          </div>
          {message.meta.inventory.locationName && (
            <div className="text-xs mt-1">
              Location: {message.meta.inventory.locationName}
            </div>
          )}
        </div>
      )}

      {isAssistant &&
        (message.meta?.delivery || message.meta?.missingAddress) && (
          <div className="mt-2 w-full bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900">
            <div className="font-semibold">Delivery</div>
            {message.meta?.missingAddress ||
            !message.meta?.fulfillment?.deliveryLocationSet ? (
              <div className="mt-1">
                <div className="text-xs text-sky-800 mb-2">
                  To show delivery rates and arrival dates, please add your
                  delivery location.
                </div>
                <button
                  type="button"
                  onClick={onOpenDeliveryLocation}
                  className="text-xs bg-white border border-sky-300 rounded px-2 py-1 hover:bg-sky-100"
                >
                  Add delivery address
                </button>
              </div>
            ) : (
              <div className="mt-1">
                <div className="text-xs text-sky-800">
                  {message.meta.delivery?.options?.find(
                    (option) =>
                      option.id === message.meta?.delivery?.selectedOptionId,
                  )?.etaText ?? "Delivery options available"}
                </div>
                <button
                  type="button"
                  onClick={onOpenDeliveryOptions}
                  className="mt-2 text-xs bg-white border border-sky-300 rounded px-2 py-1 hover:bg-sky-100"
                >
                  Change option
                </button>
              </div>
            )}
          </div>
        )}

      {isAssistant && message.meta?.promo && (
        <div className="mt-2 w-full bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
          <div className="font-semibold">
            Promo applied: {message.meta.promo.code}
          </div>
          <div>{message.meta.promo.discountText}</div>
          <div className="text-xs text-green-700 mt-1">
            {message.meta.promo.message}
          </div>
        </div>
      )}

      {isAssistant && message.meta?.order && (
        <div className="mt-2 w-full bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
          <div className="font-semibold">
            Order {message.meta.order.orderId}
          </div>
          <div>Status: {message.meta.order.status}</div>
          {message.meta.order.eta && <div>ETA: {message.meta.order.eta}</div>}
          {message.meta.order.trackingUrl && (
            <a
              href={message.meta.order.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="underline text-blue-700 text-xs"
            >
              Track shipment
            </a>
          )}
        </div>
      )}

      {isAssistant && message.meta?.stock && (
        <div className="mt-2 w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900">
          {message.meta.stock.inStock
            ? `In stock${typeof message.meta.stock.qty === "number" ? ` (${message.meta.stock.qty} available)` : ""}.`
            : "Currently out of stock."}
        </div>
      )}

      {isAssistant && message.meta?.tradeAccount && (
        <div className="mt-2 w-full bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-sm text-violet-900">
          <div className="font-semibold">Trade Accounts Programme</div>
          <div>
            Status:{" "}
            {message.meta.tradeAccount.approved
              ? "Approved"
              : "Pending approval"}
          </div>
          {message.meta.tradeAccount.accountNumber && (
            <div>Account: {message.meta.tradeAccount.accountNumber}</div>
          )}
          {message.meta.tradeAccount.pricingSummary && (
            <div className="text-xs mt-1">
              {message.meta.tradeAccount.pricingSummary}
            </div>
          )}
          {message.meta.tradeAccount.nextStep && (
            <div className="text-xs mt-1">
              Next step: {message.meta.tradeAccount.nextStep}
            </div>
          )}
        </div>
      )}

      {isAssistant && message.meta?.payment && (
        <div className="mt-2 w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-900">
          Payment {message.meta.payment.status}
        </div>
      )}

      {isAssistant && message.meta?.escalation && (
        <div className="mt-2 w-full bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-900">
          Support escalation requested. A human agent will follow up shortly.
        </div>
      )}

      {message.role === "tool" && (
        <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs text-violet-700 animate-pulse">
          Thinking…
        </div>
      )}
    </div>
  );
};
