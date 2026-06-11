ALTER PUBLICATION supabase_realtime ADD TABLE orders, clients, products, financial_entries, order_returns, production_errors, warranties;
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE clients REPLICA IDENTITY FULL;
