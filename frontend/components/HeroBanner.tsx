import React from "react";

const assets = {
  left: "https://i5.walmartimages.com/dfw/4ff9c6c9-57a4/k2-_d96a5c18-0407-4248-b751-cdef0aa2dc5e.v1.jpg?odnHeight=1316&odnWidth=1316&odnBg=&odnDynImageQuality=70",
  midTop:
    "https://i5.walmartimages.com/dfw/4ff9c6c9-b8d0/k2-_076bc213-34e2-4307-ae2f-9a0f228e776a.v1.jpg?odnHeight=584&odnWidth=1024&odnBg=&odnDynImageQuality=70",
  midBottomLeft:
    "https://i5.walmartimages.com/dfw/4ff9c6c9-5f8f/k2-_38b00c0b-ef8d-4dc3-b5a8-012d7b2424a6.v1.jpg?odnHeight=684&odnWidth=496&odnBg=&odnDynImageQuality=70",
  midBottomRight:
    "https://i5.walmartimages.com/dfw/4ff9c6c9-b62d/k2-_df0d84dd-1d18-43ee-b6ba-3ec3cb8b8901.v1.jpg?odnHeight=684&odnWidth=496&odnBg=&odnDynImageQuality=70",
  right:
    "https://i5.walmartimages.com/dfw/4ff9c6c9-a9a3/k2-_247dba7f-cee1-4774-a5ba-53b98431c1d5.v1.jpg?odnHeight=1316&odnWidth=770&odnBg=&odnDynImageQuality=70",
};

type HeroCardProps = {
  image: string;
  eyebrow?: string;
  title: string;
  cta: string;
  href: string;
};

const HeroCard: React.FC<HeroCardProps> = ({
  image,
  eyebrow,
  title,
  cta,
  href,
}) => {
  return (
    <div className="relative h-full w-full overflow-hidden object-contain rounded-3xl border border-gray-200 bg-white shadow-sm">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-white/25" />
      <div className="relative z-10 flex h-full flex-col justify-start p-6">
        {eyebrow && (
          <p className="text-sm font-semibold text-[#001E60]">{eyebrow}</p>
        )}
        <h3 className="mt-1 max-w-[18ch] text-2xl font-extrabold leading-tight text-[#001E60]">
          {title}
        </h3>
        <a
          href={href}
          className="mt-4 inline-block w-fit rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-900 shadow hover:bg-white/90"
        >
          {cta}
        </a>
      </div>
    </div>
  );
};

const HeroBanner: React.FC = () => {
  return (
    <section className="w-full overflow-hidden">
      <div className="w-full max-w-[1380px] mx-auto py-6 px-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "41.6667% 33.3333% 25%",
            gridTemplateRows: "1fr 1fr",
          }}
        >
          {/* Left (row-span-2) */}
          <div style={{ gridRow: "span 2" }}>
            <div className="aspect-square h-full w-full">
              <HeroCard
                image={assets.left}
                eyebrow="OnePay CashRewards Card"
                title="Earn 3% cash back at Walmart"
                cta="Learn more"
                href="https://www.walmart.com/cp/9435689"
              />
            </div>
          </div>

          {/* Middle Top */}
          <div>
            <div className="aspect-[16/7]">
              <HeroCard
                image={assets.midTop}
                eyebrow="Fast care for COVID, flu & strep"
                title="Get same-day testing & treatment"
                cta="Schedule now"
                href="https://www.walmart.com/cp/test-treat/4097505"
              />
            </div>
          </div>

          {/* Right (row-span-2) */}
          <div style={{ gridRow: "span 2" }}>
            <HeroCard
              image={assets.right}
              eyebrow="Self-care delivered"
              title="Relax & reset in as fast as 1 hour*"
              cta="Shop now"
              href="https://www.walmart.com/cp/6545138"
            />
          </div>

          {/* Middle Bottom: 2 Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[3/4]">
              <HeroCard
                image={assets.midBottomLeft}
                title="Subscribe to your faves"
                cta="Shop wellness"
                href="https://www.walmart.com/browse/health/all-vitamins-supplements/976760_1005863_8090261"
              />
            </div>
            <div className="aspect-[3/4]">
              <HeroCard
                image={assets.midBottomRight}
                title="Mattress Accident Plans"
                cta="Shop now"
                href="https://www.walmart.com/browse/mattresses-accessories/4044_103150_539386_9682013"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
