import React from "react";

const featuredCategories = [
  {
    title: "Hand-picked products",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Most viewed",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Recently viewed",
    image: "/images/development/Image_60.webp",
  },
  {
    title: "New arrivals",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Trending now",
    image: "/images/development/Image_44.webp",
  },
];

export const FeaturedGrid: React.FC = () => {
  return (
    <section className="w-full py-14 bg-gray-50 border-b border-black/5">
      <div className="container mx-auto px-4">
        <div className="vzqwa c6jh3 uvljd">
          <div className="gh2vn ob8cq csouw u7u2y">
            <div className="csh83 su3q0 sui5k w6wnh centered">
              <h2 className="ob8p6 ptstl rv5mm ccqoh k88oi">
                Built for Every Job
              </h2>
              <p className="tpn4r hv19o">
                Quickly access our most popular, recently viewed, and expertly
                selected products.
              </p>
            </div>
            <div className="q9ykv bxu22 rvp3m s9jre anzvy d1qet">
              {featuredCategories.map((category) => (
                <article
                  key={category.title}
                  className="rounded-lg tkpqo rzrf1 zmtzv"
                >
                  <a href="#" className="riaed sp8wj gkla9">
                    <img
                      className="dtgy0 ydp1t pkm06 g0umx jjp9t"
                      alt={`${category.title} category`}
                      src={category.image}
                    />
                  </a>
                  <div className="iye86 sl5wm nigo6 adkhu fpj12">
                    <h3 className="ob8p6 dnyje hv19o khqxe">
                      {category.title}
                    </h3>
                    <p className="tpn4r f9dgp">Shop now</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
