import {
  ChatMessage,
  DeliveryStatus,
  FulfillmentContext,
  InventoryStatus,
  ToolCall,
  ToolRouterResult,
} from "../types";
import { CustomerContext } from "../context/customerContext";
import {
  applyPromoApi,
  createOrderApi,
  createPaymentIntentApi,
  fetchDeliveryBatch,
  fetchDeliveryOptions,
  fetchInventory,
  fetchInventoryBatch,
  getStockApi,
  getTradeAccountApi,
  imageSearchApi,
  productSearchApi,
  scheduleAbandonmentReminderApi,
  trackOrderApi,
} from "./api";
import { DecisionModeAnswers, Product } from "../types";
import { pickBestFitProduct, rankDecisionProducts } from "./decisionMode";

export async function executeToolCall(
  toolCall: ToolCall,
  helpers?: {
    imageFile?: File;
    customerContext?: CustomerContext;
    fulfillment?: FulfillmentContext;
  },
): Promise<ToolRouterResult> {
  const context = helpers?.customerContext;
  const fulfillment = helpers?.fulfillment;

  const normalize = (value: string) => value.trim().toLowerCase();

  const inferProductBrand = (title: string): string | undefined => {
    const knownBrands = [
      "bosch",
      "dewalt",
      "makita",
      "stanley",
      "ryobi",
      "ingco",
    ];

    const lowerTitle = title.toLowerCase();
    return knownBrands.find((brand) => lowerTitle.includes(brand));
  };

  const inferProductCategory = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("drill")) return "drills";
    if (lowerTitle.includes("saw")) return "saws";
    if (lowerTitle.includes("sander")) return "sanders";
    if (lowerTitle.includes("shoe")) return "shoes";
    return "general";
  };

  const applyContextBias = (
    products: ToolRouterResult["products"],
  ): ToolRouterResult["products"] => {
    if (!products || !context) {
      return products;
    }

    const preferredBrands = (context.preferredBrands ?? []).map(normalize);
    const preferredCategories = (context.frequentlyBoughtCategories ?? []).map(
      normalize,
    );
    const minPrice = context.preferredPriceRange?.min;
    const maxPrice = context.preferredPriceRange?.max;

    const scored = products.map((product) => {
      const brand = inferProductBrand(product.title);
      const category = inferProductCategory(product.title);

      let score = 0;

      if (brand && preferredBrands.includes(brand)) {
        score += 4;
      }

      if (preferredCategories.includes(normalize(category))) {
        score += 3;
      }

      if (typeof maxPrice === "number" && product.price <= maxPrice) {
        score += 2;
      }

      if (typeof minPrice === "number" && product.price >= minPrice) {
        score += 1;
      }

      return { product, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);
  };

  const parseDecisionAnswers = (): DecisionModeAnswers | undefined => {
    const contextRaw = toolCall.args.context;
    if (!contextRaw || typeof contextRaw !== "object") {
      return undefined;
    }

    const record = contextRaw as Record<string, unknown>;
    const decisionRaw = record.decisionAnswers;
    if (!decisionRaw || typeof decisionRaw !== "object") {
      return undefined;
    }

    return decisionRaw as DecisionModeAnswers;
  };

  const buildDecisionShortlist = (
    products: Product[] | undefined,
    decisionAnswers?: DecisionModeAnswers,
  ): Product[] | undefined => {
    if (!products?.length) {
      return products;
    }

    const contextBiased = applyContextBias(products) ?? products;
    if (!decisionAnswers) {
      return contextBiased.slice(0, 5);
    }

    const ranked = rankDecisionProducts(contextBiased, decisionAnswers).slice(
      0,
      5,
    );
    const bestFit = pickBestFitProduct(ranked, decisionAnswers);

    return ranked.map((product) => ({
      ...product,
      isBestFit: Boolean(bestFit && bestFit.id === product.id),
    }));
  };

  const mergeEnrichmentIntoProducts = (
    products: Product[] | undefined,
    inventoryBatch: Record<string, InventoryStatus>,
    deliveryBatch: Record<string, DeliveryStatus> | null,
  ): Product[] | undefined => {
    if (!products) {
      return products;
    }

    return products.map((product) => {
      const inventory = inventoryBatch[product.id];
      const delivery = deliveryBatch?.[product.id];
      const selectedDelivery =
        delivery?.options.find(
          (item) => item.id === delivery.selectedOptionId,
        ) ?? delivery?.options[0];

      return {
        ...product,
        stockLevel: inventory?.level,
        stockQty: inventory?.qty ?? product.stockQty,
        inStock:
          inventory?.level === "in_stock" || inventory?.level === "low_stock"
            ? true
            : inventory?.level === "out_of_stock"
              ? false
              : product.inStock,
        deliveryEtaText: selectedDelivery?.etaText,
        deliveryEtaDays: selectedDelivery?.etaDays,
        deliveryEta: selectedDelivery?.etaDate,
        deliveryPrice: selectedDelivery?.price,
        deliveryBadge: selectedDelivery?.badge,
        deliveryOptionId: selectedDelivery?.id,
      };
    });
  };

  switch (toolCall.tool) {
    case "productSearch": {
      const query = String(toolCall.args.query ?? "popular");
      const userId =
        typeof toolCall.args.userId === "string"
          ? toolCall.args.userId
          : undefined;
      const contextRaw = toolCall.args.context;
      const context =
        typeof contextRaw === "string"
          ? contextRaw
          : typeof contextRaw === "object" && contextRaw !== null
            ? JSON.stringify(contextRaw)
            : undefined;
      const { products, assistantText } = await productSearchApi({
        query,
        userId,
        context,
      });
      const decisionAnswers = parseDecisionAnswers();

      return {
        products: buildDecisionShortlist(products, decisionAnswers),
        assistantText,
      };
    }

    case "imageSearch": {
      if (!helpers?.imageFile) {
        return {
          assistantText:
            "Please attach an image so I can run image-based search.",
        };
      }
      const { products, assistantText } = await imageSearchApi(
        helpers.imageFile,
      );
      return { products, assistantText };
    }

    case "getStock": {
      const productId = String(toolCall.args.productId ?? "");
      const { stock, assistantText } = await getStockApi(productId);
      const locationId =
        typeof toolCall.args.locationId === "string"
          ? toolCall.args.locationId
          : (fulfillment?.pickupStoreId ?? undefined);
      const inventory = await fetchInventory(
        productId,
        locationId ?? undefined,
      );
      return { stock, inventory, assistantText };
    }

    case "getDelivery": {
      const productId = String(toolCall.args.productId ?? "");
      const destinationRaw =
        (toolCall.args.destination as FulfillmentContext["deliveryAddress"]) ??
        fulfillment?.deliveryAddress ??
        null;
      const pickupStoreId =
        typeof toolCall.args.pickupStoreId === "string"
          ? toolCall.args.pickupStoreId
          : (fulfillment?.pickupStoreId ?? undefined);

      const delivery = await fetchDeliveryOptions(productId, destinationRaw, {
        pickupStoreId,
      });

      if ("missingAddress" in delivery) {
        return {
          missingAddress: true,
          assistantText:
            "To show delivery rates and arrival dates, please add your delivery location.",
        };
      }

      return {
        delivery,
        assistantText: "Here are delivery options for this product.",
      };
    }

    case "enrichProducts": {
      const productIdsRaw = toolCall.args.productIds;
      const productIds = Array.isArray(productIdsRaw)
        ? productIdsRaw.map((entry) => String(entry))
        : [];
      const productsRaw = toolCall.args.products;
      const products = Array.isArray(productsRaw)
        ? (productsRaw as Product[])
        : undefined;

      const locationId =
        typeof toolCall.args.locationId === "string"
          ? toolCall.args.locationId
          : (fulfillment?.pickupStoreId ?? undefined);
      const destinationRaw =
        (toolCall.args.destination as FulfillmentContext["deliveryAddress"]) ??
        fulfillment?.deliveryAddress ??
        null;
      const pickupStoreId =
        typeof toolCall.args.pickupStoreId === "string"
          ? toolCall.args.pickupStoreId
          : (fulfillment?.pickupStoreId ?? undefined);

      const inventoryBatch = await fetchInventoryBatch(productIds, locationId);
      const deliveryBatchResult = await fetchDeliveryBatch(
        productIds,
        destinationRaw,
        { pickupStoreId },
      );

      if ("missingAddress" in deliveryBatchResult) {
        return {
          products: mergeEnrichmentIntoProducts(products, inventoryBatch, null),
          inventoryBatch,
          missingAddress: true,
          assistantText:
            "Add delivery address to see rates and ETA for these products.",
        };
      }

      return {
        products: mergeEnrichmentIntoProducts(
          products,
          inventoryBatch,
          deliveryBatchResult,
        ),
        inventoryBatch,
        deliveryBatch: deliveryBatchResult,
      };
    }

    case "findInStockAlternatives": {
      const productId = String(toolCall.args.productId ?? "");
      const query = String(toolCall.args.query ?? "similar in-stock products");
      const search = await productSearchApi({ query });
      const candidates = (search.products ?? []).filter(
        (product) => product.id !== productId,
      );

      const inventoryBatch = await fetchInventoryBatch(
        candidates.map((item) => item.id),
        fulfillment?.pickupStoreId ?? undefined,
      );

      const inStock = candidates.filter((product) => {
        const inventory = inventoryBatch[product.id];
        return (
          inventory?.level === "in_stock" || inventory?.level === "low_stock"
        );
      });

      const top = inStock.slice(0, 3);
      const deliveryBatchResult = await fetchDeliveryBatch(
        top.map((item) => item.id),
        fulfillment?.deliveryAddress ?? null,
        {
          pickupStoreId: fulfillment?.pickupStoreId,
        },
      );

      const enrichedTop = top.map((product) => {
        const inventory = inventoryBatch[product.id];
        const delivery =
          "missingAddress" in deliveryBatchResult
            ? undefined
            : deliveryBatchResult[product.id];
        const selectedOption = delivery?.options[0];

        return {
          ...product,
          stockLevel: inventory?.level,
          stockQty: inventory?.qty,
          inStock: true,
          deliveryEtaText: selectedOption?.etaText,
          deliveryEtaDays: selectedOption?.etaDays,
          deliveryPrice: selectedOption?.price,
          deliveryOptionId: selectedOption?.id,
        };
      });

      return {
        products: enrichedTop,
        missingAddress:
          (deliveryBatchResult as { missingAddress?: boolean })
            .missingAddress === true,
        assistantText:
          "That’s out of stock near you. Here are 3 similar items available now.",
      };
    }

    case "applyPromo": {
      const cartId = String(toolCall.args.cartId ?? "guest-cart");
      const code = String(toolCall.args.code ?? "SAVE10");
      const { promo, assistantText } = await applyPromoApi({ cartId, code });
      return { promo, assistantText };
    }

    case "createOrder": {
      const cartId = String(toolCall.args.cartId ?? "guest-cart");
      const shippingAddress = String(
        toolCall.args.shippingAddress ?? "TODO: Connect user address",
      );
      const { order, assistantText } = await createOrderApi({
        cartId,
        shippingAddress,
      });
      return { order, assistantText };
    }

    case "trackOrder": {
      const orderId = String(toolCall.args.orderId ?? "");
      const { order, assistantText } = await trackOrderApi(orderId);
      return { order, assistantText };
    }

    case "createPaymentIntent": {
      const orderId = String(toolCall.args.orderId ?? "");
      const amountRaw = toolCall.args.amount;
      const amount =
        typeof amountRaw === "number" ? amountRaw : Number(amountRaw ?? 0);
      const response = await createPaymentIntentApi({ orderId, amount });
      return {
        assistantText: response.assistantText,
      };
    }

    case "getTradeAccount": {
      const userId = String(toolCall.args.userId ?? "guest-user");
      const { tradeAccount, assistantText } = await getTradeAccountApi({
        userId,
      });
      return { tradeAccount, assistantText };
    }

    case "scheduleAbandonmentReminder": {
      const cartId = String(toolCall.args.cartId ?? "");
      const userId =
        typeof toolCall.args.userId === "string"
          ? toolCall.args.userId
          : undefined;
      const delaySecondsRaw = toolCall.args.delaySeconds;
      const delaySeconds =
        typeof delaySecondsRaw === "number"
          ? delaySecondsRaw
          : Number(delaySecondsRaw ?? 60);
      await scheduleAbandonmentReminderApi({ cartId, userId, delaySeconds });
      return {
        assistantText:
          "Cart reminder has been scheduled. I can also apply a promo now.",
      };
    }

    default:
      return {
        assistantText: `Unsupported tool: ${toolCall.tool}`,
      };
  }
}

export function buildToolMessage(toolCall: ToolCall): ChatMessage {
  return {
    id: `tool-${Date.now()}`,
    role: "tool",
    content: `Running ${toolCall.tool}...`,
    createdAt: new Date().toISOString(),
    meta: { toolCall },
  };
}
