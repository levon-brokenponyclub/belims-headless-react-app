import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

type FilterOption = {
  label: string;
  count: number;
};

interface FilterSearchProps {
  brands: FilterOption[];
  categories: FilterOption[];
  ranges: FilterOption[];
}

export const FilterSearch: React.FC<FilterSearchProps> = ({
  brands,
  categories,
  ranges,
}) => {
  const navigate = useNavigate();
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRange, setSelectedRange] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (selectedBrand) params.set("brand", selectedBrand);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedRange) params.set("range", selectedRange);

    const query = params.toString();
    navigate(query ? `/shop?${query}` : "/shop");
  };

  return (
    <section className="bg-belims-blue py-6 md:py-8 lg:py-10">
      <div className="container mx-auto max-w-[1400px] px-3 lg:px-6">
        <div className="section-filters-form-wrap">
          <div className="collections-filtering">
            <form className="section-filters-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <div className="label-with-tooltip">
                  <label htmlFor="template--16744254570748__filters_7ATDHT-filter-1">
                    Choose a brand...
                  </label>
                  <button
                    type="button"
                    className="tooltip"
                    aria-label="Start by picking your favorite tool brand."
                  >
                    <span>Start by picking your favorite tool brand.</span>
                  </button>
                </div>

                <select
                  className="dropdown-filter"
                  id="template--16744254570748__filters_7ATDHT-filter-1"
                  data-label="Brand"
                  data-index="1"
                  value={selectedBrand}
                  onChange={(event) => setSelectedBrand(event.target.value)}
                >
                  <option className="default" value="" disabled>
                    Choose a brand...
                  </option>
                  {brands.map((brand) => (
                    <option
                      key={brand.label}
                      value={brand.label}
                      data-count={brand.count}
                      data-param-name="filter.p.vendor"
                    >
                      {brand.label} ({brand.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div className="label-with-tooltip">
                  <label htmlFor="template--16744254570748__filters_7ATDHT-filter-2">
                    Choose a category
                  </label>
                  <button
                    type="button"
                    className="tooltip"
                    aria-label="Select the type of tool you're looking for."
                  >
                    <span>Select the type of tool you're looking for.</span>
                  </button>
                </div>

                <select
                  className="dropdown-filter"
                  id="template--16744254570748__filters_7ATDHT-filter-2"
                  data-label="Category"
                  data-index="2"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  <option className="default" value="" disabled>
                    Choose a category
                  </option>
                  {categories.map((category) => (
                    <option
                      key={category.label}
                      value={category.label}
                      data-count={category.count}
                      data-param-name="filter.p.t.category"
                    >
                      {category.label} ({category.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div className="label-with-tooltip">
                  <label htmlFor="template--16744254570748__filters_7ATDHT-filter-3">
                    Choose a range
                  </label>
                  <button
                    type="button"
                    className="tooltip"
                    aria-label="Choose a product range to narrow your search."
                  >
                    <span>Choose a product range to narrow your search.</span>
                  </button>
                </div>

                <select
                  className="dropdown-filter"
                  id="template--16744254570748__filters_7ATDHT-filter-3"
                  data-label="Range"
                  data-index="3"
                  value={selectedRange}
                  onChange={(event) => setSelectedRange(event.target.value)}
                >
                  <option className="default" value="" disabled>
                    Choose a range
                  </option>
                  {ranges.map((range) => (
                    <option
                      key={range.label}
                      value={range.label}
                      data-count={range.count}
                      data-param-name="filter.p.m.my_fields.range"
                    >
                      {range.label} ({range.count})
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="button button-block">
                Search
                <div className="button-overlay-spinner hidden">
                  <span className="spinner-xs"></span>
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
