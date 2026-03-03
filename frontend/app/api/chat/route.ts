export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    messages?: Array<{ content?: string }>;
    context?: {
      userId?: string;
      cartId?: string;
      lastViewedProducts?: string[];
      fulfillment?: {
        deliveryAddress?: {
          street?: string;
          city?: string;
          province?: string;
          postalCode?: string;
        } | null;
      };
    };
  };

  const latest = body.messages?.[body.messages.length - 1]?.content ?? "";
  const text = latest.trim();
  const userId = body.context?.userId ?? "guest-user";
  const cartId = body.context?.cartId ?? "guest-cart";
  const deliveryAddress = body.context?.fulfillment?.deliveryAddress;
  const shippingAddress = [
    deliveryAddress?.street,
    deliveryAddress?.city,
    deliveryAddress?.province,
    deliveryAddress?.postalCode,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ");

  if (
    /RECOMMEND_PRODUCTS|recommend|suggest|help me choose|finder/i.test(text)
  ) {
    return Response.json({
      message: {
        role: "assistant",
        content: "I’ll search the live catalog for you now.",
        meta: {
          toolCall: {
            tool: "productSearch",
            args: { query: text || "popular", userId },
          },
        },
      },
    });
  }

  if (/FIND_BY_IMAGE|image search|\/image/i.test(text)) {
    return Response.json({
      message: {
        role: "assistant",
        content: "Uploading your image to run a live visual search.",
        meta: {
          toolCall: {
            tool: "imageSearch",
            args: { imageFile: "selected" },
          },
        },
      },
    });
  }

  if (/TRACK_ORDER|\/track/i.test(text)) {
    const orderId =
      text
        .replace(/.*\/track\s*/i, "")
        .replace("TRACK_ORDER", "")
        .trim() || "";

    if (!orderId) {
      return Response.json({
        message: {
          role: "assistant",
          content: "Please share an order number so I can track it.",
        },
      });
    }

    return Response.json({
      message: {
        role: "assistant",
        content: "Checking your latest tracking update.",
        meta: {
          toolCall: {
            tool: "trackOrder",
            args: { orderId },
          },
        },
      },
    });
  }

  if (/APPLY_DISCOUNT|\/promo|discount/i.test(text)) {
    const codeMatch = text.match(/(SAVE\d+|WELCOME\d+)/i);
    return Response.json({
      message: {
        role: "assistant",
        content: "Applying your promo code now.",
        meta: {
          toolCall: {
            tool: "applyPromo",
            args: {
              cartId,
              code: codeMatch?.[1] ?? "",
            },
          },
        },
      },
    });
  }

  if (/CHECK_STOCK[:\s]/i.test(text)) {
    const parsedId = text.split(":")[1]?.trim() ?? "";
    const productId = parsedId || body.context?.lastViewedProducts?.[0] || "";

    if (!productId) {
      return Response.json({
        message: {
          role: "assistant",
          content:
            "Choose a product first, then I can run a live stock check for it.",
        },
      });
    }

    return Response.json({
      message: {
        role: "assistant",
        content: "Checking live stock status.",
        meta: {
          toolCall: {
            tool: "getStock",
            args: { productId },
          },
        },
      },
    });
  }

  if (/TRADE_ACCOUNT|trade account|trade pricing|trade programme/i.test(text)) {
    return Response.json({
      message: {
        role: "assistant",
        content: "I’ll pull your Trade Accounts Programme status.",
        meta: {
          toolCall: {
            tool: "getTradeAccount",
            args: { userId },
          },
        },
      },
    });
  }

  if (/checkout|place order|buy now/i.test(text)) {
    return Response.json({
      message: {
        role: "assistant",
        content: "I can start checkout and payment for you.",
        meta: {
          toolCall: {
            tool: "createOrder",
            args: {
              cartId,
              shippingAddress:
                shippingAddress || "Customer address not supplied",
            },
          },
        },
      },
    });
  }

  return Response.json({
    message: {
      role: "assistant",
      content:
        "I can help with live product search, stock, promos, orders, and trade account checks.",
    },
  });
}
