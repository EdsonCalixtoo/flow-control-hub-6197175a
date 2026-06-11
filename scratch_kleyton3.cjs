const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://glcgtnopotluvppsygyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY2d0bm9wb3RsdXZwcHN5Z3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NzQ0NTMsImV4cCI6MjA5NTI1MDQ1M30.pXDsAhQXZkLoMDk36ON0k9jaNw_HpakeTIMBIcPe9zk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKleytonItems() {
  const { data: order, error } = await supabase
    .from('orders')
    .select('items')
    .ilike('carrier', '%leyton%')
    .limit(1)
    .single();

  console.log(JSON.stringify(order.items, null, 2));
}

checkKleytonItems();
