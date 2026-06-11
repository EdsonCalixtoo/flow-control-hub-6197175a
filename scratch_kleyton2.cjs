const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://glcgtnopotluvppsygyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY2d0bm9wb3RsdXZwcHN5Z3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NzQ0NTMsImV4cCI6MjA5NTI1MDQ1M30.pXDsAhQXZkLoMDk36ON0k9jaNw_HpakeTIMBIcPe9zk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKleyton() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, number, status, carrier, items')
    .ilike('carrier', '%leyton%');

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }
  
  console.log(`Pedidos para Kleyton encontrados: ${orders.length}`);
  
  orders.forEach(order => {
    let q = 0;
    let itemsInfo = (order.items || []).map(i => {
        q += Number(i.quantity || 1);
        return `${i.quantity}x ${i.name}`;
    }).join(', ');
    console.log(`- ${order.number} [${order.status}]: ${itemsInfo}`);
  });
}

checkKleyton();
