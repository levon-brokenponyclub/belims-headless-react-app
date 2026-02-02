import React from "react";

const categories = [
  {
    title: "Power Tools",
    count: "1,240 Pieces",
    image:
      "/images/development/man-portrait-tools-with-arms-crossed-home-development-construction-renovation-workshop-carpenter-male-employee-contractor-maintenance-drill-repair-work-diy.webp",
  },
  {
    title: "Hand Tools",
    count: "850 Pieces",
    image:
      "/images/development/midsection-worker-using-circular-saw-workshop.webp",
  },
  {
    title: "Safety Equipment",
    count: "420 Pieces",
    image:
      "/images/development/18920_d0e420f0-fd13-40c8-b17d-c5423b3805ac.webp",
  },
  {
    title: "Plumbing",
    count: "680 Pieces",
    image:
      "/images/development/2147944853_7e958e74-e33b-4336-9aa0-ecfb13fb48bf.webp",
  },
  {
    title: "Electrical",
    count: "540 Pieces",
    image:
      "/images/development/2149451030_1163c5d2-c3df-428e-b198-96c8af43ee3a.webp",
  },
];

export const CollageGrid: React.FC = () => {
  return (
    <section className="z6jzj py-12">
      <div className="s8lcs msltt gbzbb rregi container mx-auto px-4">
        <div className="ovzaa p5brp jiygb jwufa qy82i flex flex-col lg:flex-row gap-6">
          {/* Main Featured Block (Article 1) */}
          <article className="wxac3 f6zfz ivx2n gssxt ya4js relative lg:w-1/2 group overflow-hidden rounded-lg h-[600px]">
            <img
              className="ew040 f6zfz fsxqb wi6ww absolute inset-0 w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700"
              alt={categories[0].title}
              src={categories[0].image}
            />
            <div className="zc10g ttj7a ew040 f6zfz d1v3n gahlj safue absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
            <div className="zc10g v89yl xvofv dmkaq ovzaa cw2h6 hkfzp dib8x u059s absolute bottom-0 left-0 p-8 w-full flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <span className="cg6y5 pnmys mb-2 block text-gray-200 text-sm italic">
                  {categories[0].count}
                </span>
                <h3 className="v3ztq qjmc5 u059s xhx27 text-white text-3xl font-bold">
                  {categories[0].title}
                </h3>
              </div>
              <a
                href="#"
                className="dqghp vrbr6 q4imd cg6y5 qjmc5 mkn0h a2aqi flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md px-6 py-3 rounded text-white font-bold hover:bg-white hover:text-black transition-all"
              >
                Shop {categories[0].title}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9.62 18.25L15.87 12L9.62 5.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </a>
            </div>
          </article>

          {/* Right Container */}
          <div className="lv697 cilnd ul6lo lzux5 lg:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.slice(1).map((cat, idx) => (
              <article
                key={idx}
                className="wxac3 f6zfz ivx2n gssxt relative group overflow-hidden rounded-lg h-[288px]"
              >
                <img
                  className="ew040 f6zfz fsxqb wi6ww absolute inset-0 w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-700"
                  alt={cat.title}
                  src={cat.image}
                />
                <div className="zc10g ttj7a ew040 f6zfz d1v3n gahlj safue absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors"></div>
                <div className="zc10g v89yl xvofv dmkaq dib8x u059s absolute inset-0 p-6 flex flex-col justify-end">
                  <div>
                    <span className="cg6y5 pnmys mb-1 block text-gray-200 text-xs italic">
                      {cat.count}
                    </span>
                    <h3 className="v3ztq qjmc5 u059s xhx27 text-white text-xl font-bold mb-3">
                      {cat.title}
                    </h3>
                  </div>
                  <a
                    href="#"
                    className="dqghp vrbr6 q4imd cg6y5 qjmc5 mkn0h a2aqi flex items-center gap-1 text-white text-sm font-bold bg-white/10 backdrop-blur-sm self-start px-4 py-2 rounded hover:bg-white hover:text-black transition-all"
                  >
                    Shop {cat.title}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M7.29167 15.833L12.5 10.6247L7.29167 5.41634"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollageGrid;
