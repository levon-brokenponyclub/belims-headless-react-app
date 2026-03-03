import { Product } from "../types/index";

export class ProductService {
  static async search(query: string): Promise<Product[]> {
    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock data
    const mockProducts: Product[] = [
      {
        id: "1",
        name: "DeWalt 20V Max Drill",
        price: 129.99,
        image: "https://via.placeholder.com/150",
        sku: "DCD771C2",
        inStock: true,
        eta: "Tomorrow",
        rating: 4.8,
        category: "Power Tools",
        specs: { brand: "DeWalt", voltage: "20V" },
        description: "Compact, lightweight design fits into tight areas.",
      },
      {
        id: "2",
        name: "Milwaukee M18 Fuel",
        price: 159.0,
        image: "https://via.placeholder.com/150",
        sku: "MWK-18",
        inStock: true,
        eta: "Today",
        rating: 4.9,
        category: "Power Tools",
        specs: { brand: "Milwaukee", voltage: "18V", grade: "Pro" },
        description: "Most powerful drill in its class.",
      },
      {
        id: "3",
        name: "Ryobi One+ 18V",
        price: 59.97,
        image: "https://via.placeholder.com/150",
        sku: "P215K",
        inStock: true,
        eta: "2 Days",
        rating: 4.5,
        category: "Power Tools",
        specs: { brand: "Ryobi", voltage: "18V" },
        description: "Great for DIY projects.",
      },
      {
        id: "4",
        name: "Makita 18V LXT",
        price: 99.0,
        image: "https://via.placeholder.com/150",
        sku: "XFD131",
        inStock: false,
        eta: "1 Week",
        rating: 4.7,
        category: "Power Tools",
        specs: { brand: "Makita", voltage: "18V" }, // Missing grade, assume standard
        description: "Durable and reliable workhorse.",
      },
    ];

    return mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()),
    );
  }

  static async getById(id: string): Promise<Product | undefined> {
    return (await this.search("")).find((p) => p.id === id);
  }
}
