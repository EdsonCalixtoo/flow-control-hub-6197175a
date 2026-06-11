const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://glcgtnopotluvppsygyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY2d0bm9wb3RsdXZwcHN5Z3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NzQ0NTMsImV4cCI6MjA5NTI1MDQ1M30.pXDsAhQXZkLoMDk36ON0k9jaNw_HpakeTIMBIcPe9zk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKleytonKits() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, number, status, carrier, items')
    .ilike('carrier', '%leyton%')
    .not('status', 'in', '("entregue", "cancelado")');

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }
  
  let totalKits = 0;
  let statusCount = {};

  orders.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    let kitsInOrder = 0;
    
    items.forEach(item => {
      const product = (item.product || '').toUpperCase();
      // Assume that if the word "KIT" is in the product name, it's a kit.
      if (product.includes('KIT')) {
        kitsInOrder += Number(item.quantity || 1);
      }
    });

    if (kitsInOrder > 0) {
      totalKits += kitsInOrder;
      statusCount[order.status] = (statusCount[order.status] || 0) + kitsInOrder;
    }
  });

  console.log(`\nTotal de Kits para transportadora Kleyton (pedidos não entregues/cancelados): ${totalKits}`);
  console.log('Breakdown por status do pedido:');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`- ${status}: ${count} kits`);
  });
}

checkKleytonKits();
