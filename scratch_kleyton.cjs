const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://glcgtnopotluvppsygyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY2d0bm9wb3RsdXZwcHN5Z3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NzQ0NTMsImV4cCI6MjA5NTI1MDQ1M30.pXDsAhQXZkLoMDk36ON0k9jaNw_HpakeTIMBIcPe9zk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKits() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, number, status, carrier, items')
    .not('status', 'in', '("entregue", "cancelado")');

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  let totalKits = 0;
  let statusCount = {};

  orders.forEach(order => {
    const carrier = (order.carrier || '').toUpperCase().trim();
    if (carrier.includes('KLEYTON') || carrier.includes('CLEYTON')) {
      const items = Array.isArray(order.items) ? order.items : [];
      let kitsInOrder = 0;
      
      items.forEach(item => {
        const name = (item.name || '').toUpperCase();
        if (name.includes('KIT')) {
          kitsInOrder += Number(item.quantity || 1);
        }
      });

      if (kitsInOrder > 0) {
        totalKits += kitsInOrder;
        statusCount[order.status] = (statusCount[order.status] || 0) + kitsInOrder;
        console.log(`Pedido ${order.number} (${order.status}): ${kitsInOrder} kits`);
      }
    }
  });

  console.log(`\nTotal de Kits para Kleyton: ${totalKits}`);
  console.log('Por status:');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`- ${status}: ${count}`);
  });
}

checkKits();
