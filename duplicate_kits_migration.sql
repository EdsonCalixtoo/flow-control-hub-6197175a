INSERT INTO public.products (
  sku, 
  name, 
  description, 
  category, 
  unit_price, 
  cost_price, 
  stock_quantity, 
  min_stock, 
  unit, 
  supplier, 
  status
)
SELECT 
  sku || suffix,
  name || suffix,
  description,
  category,
  unit_price,
  cost_price,
  stock_quantity,
  min_stock,
  unit,
  supplier,
  status
FROM public.products
CROSS JOIN (VALUES (' DTP .N'), (' DTP .A')) AS v(suffix)
WHERE name ILIKE '%KIT%'
  AND name NOT ILIKE '%DTP%';
