function calculateSimpleRevenue(purchase, _product) {
  const discountRate = 1 - purchase.discount / 100;
  return purchase.sale_price * purchase.quantity * discountRate;
}

function calculateBonusByProfit(index, total, seller) {
  if (index === 0) return seller.profit * 0.15;
  if (index === 1 || index === 2) return seller.profit * 0.10;
  if (index === total - 1) return 0;
  return seller.profit * 0.05;
}

function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options;

  if (
    !data ||
    !Array.isArray(data.sellers) || data.sellers.length === 0 ||
    !Array.isArray(data.products) || data.products.length === 0 ||
    !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
  ) {
    throw new Error('Некорректные входные данные');
  }

  if (!calculateRevenue || !calculateBonus) {
    throw new Error('Отсутствуют необходимые функции расчёта');
  }

  const productIndex = Object.fromEntries(data.products.map(p => [p.sku, p]));

  const sellerStats = data.sellers.map(seller => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {}
  }));
  const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.seller_id, s]));

  data.purchase_records.forEach(record => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    seller.sales_count += 1;

    record.items.forEach(item => {
      const product = productIndex[item.sku];
      if (!product) return;

      const revenue = +calculateRevenue(item, product).toFixed(2);
      const cost = product.purchase_price * item.quantity;
      const profit = revenue - cost;

      seller.revenue += revenue;
      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // Сортировка по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);

  const totalSellers = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, totalSellers, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Округление только в финальной сборке
  return sellerStats.map(seller => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2)
  }));
}
