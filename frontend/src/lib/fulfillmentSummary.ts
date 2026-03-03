type PickupInput = {
  available?: number;
};

type DeliveryRateInput = {
  id: string;
  total_price: number;
  expected_delivery_date?: string;
};

type DeliveryInput = {
  hasAddress: boolean;
  loading: boolean;
  rates: DeliveryRateInput[];
  hasError?: boolean;
};

interface BuildFulfillmentSummaryArgs {
  pickup: PickupInput;
  delivery: DeliveryInput;
}

const formatDateLabel = (value: string): string | null => {
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
};

const parseEtaRange = (
  expectedDeliveryDate?: string,
): { startDate?: Date; endDate?: Date; text: string } | null => {
  if (!expectedDeliveryDate) {
    return null;
  }

  const value = expectedDeliveryDate.trim();
  if (!value) {
    return null;
  }

  if (value.includes(" - ")) {
    const [startRaw, endRaw] = value.split(" - ").map((part) => part.trim());
    const startParsed = new Date(startRaw);
    const endParsed = new Date(endRaw);

    const start = formatDateLabel(startRaw);
    const end = formatDateLabel(endRaw);

    return {
      startDate: Number.isNaN(startParsed.getTime()) ? undefined : startParsed,
      endDate: Number.isNaN(endParsed.getTime()) ? undefined : endParsed,
      text:
        start && end
          ? start === end
            ? `Arrives ${start}`
            : `Arrives ${start}–${end}`
          : value,
    };
  }

  const parsed = new Date(value);
  const label = formatDateLabel(value);

  return {
    startDate: Number.isNaN(parsed.getTime()) ? undefined : parsed,
    endDate: Number.isNaN(parsed.getTime()) ? undefined : parsed,
    text: label ? `Arrives ${label}` : value,
  };
};

export const getDeliveryOptionMarkers = (rates: DeliveryRateInput[]) => {
  if (!rates.length) {
    return {
      fastestOptionId: undefined as string | undefined,
      cheapestOptionId: undefined as string | undefined,
    };
  }

  let cheapestOptionId = rates[0]?.id;
  let cheapestPrice = rates[0]?.total_price ?? Number.POSITIVE_INFINITY;

  for (const rate of rates) {
    if (rate.total_price < cheapestPrice) {
      cheapestPrice = rate.total_price;
      cheapestOptionId = rate.id;
    }
  }

  const withParsedEta = rates
    .map((rate) => {
      const parsed = parseEtaRange(rate.expected_delivery_date);
      const start = parsed?.startDate;
      return {
        id: rate.id,
        startMs: start ? start.getTime() : Number.POSITIVE_INFINITY,
      };
    })
    .filter((rate) => Number.isFinite(rate.startMs));

  const fastestOptionId = withParsedEta.length
    ? withParsedEta.reduce((best, current) =>
        current.startMs < best.startMs ? current : best,
      ).id
    : undefined;

  return { fastestOptionId, cheapestOptionId };
};

const formatFromPrice = (amount: number): string => {
  if (!Number.isFinite(amount)) return "";
  return `R${Math.round(amount)}`;
};

export const buildFulfillmentMicroSummary = ({
  pickup,
  delivery,
}: BuildFulfillmentSummaryArgs): string => {
  const isPickupAvailable = (pickup.available ?? 0) > 0;
  const pickupText = isPickupAvailable
    ? "Pickup available"
    : "Pickup unavailable";

  if (!delivery.hasAddress) {
    return `${pickupText} • Add address for delivery options`;
  }

  if (delivery.loading) {
    return `${pickupText} • Loading delivery options…`;
  }

  if (delivery.hasError) {
    return `${pickupText} • Delivery options unavailable for this address.`;
  }

  if (!delivery.rates.length) {
    return `${pickupText} • Delivery options unavailable for this address.`;
  }

  const cheapestRate = delivery.rates.reduce((best, current) =>
    current.total_price < best.total_price ? current : best,
  );

  const eta = parseEtaRange(cheapestRate.expected_delivery_date);
  const etaText = eta?.text ?? "Delivery options available";
  const fromPrice = formatFromPrice(cheapestRate.total_price);

  return fromPrice
    ? `${pickupText} • Delivery: ${etaText} from ${fromPrice}`
    : `${pickupText} • Delivery: ${etaText}`;
};

export const formatDeliveryEtaText = (
  expectedDeliveryDate?: string,
): string => {
  const parsed = parseEtaRange(expectedDeliveryDate);
  return parsed?.text ?? "Estimated Arrival";
};
