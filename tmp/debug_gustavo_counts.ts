import { createClient } from '@supabase/supabase-client';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const main = async () => {
  const { data: orders, error } = await supabase.from('orders').select('*').eq('seller_name', 'GUSTAVO');
  if (error) { console.error(error); return; }

  // Consider orders in the correct range for 04/2026?
  // User's report is for 04/2026.
  // We'll iterate through all and see the status and items.
  
  let totalSold = 0;
  let rewardCount = 0;
  let itemsSold: any[] = [];

  // Filter based on the same logic (after some date before 04/2026 until now?)
  // Actually, I'll just list all items of the last 140 orders.
  
  orders.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const relevantOrders = orders.filter(o => !['rascunho', 'orcamento', 'rejeitado_financeiro'].includes(o.status));
  
  relevantOrders.forEach(o => {
    o.items.forEach((i: any) => {
       if (i.isReward) {
         rewardCount += i.quantity;
         console.log(`[REWARD] #${o.number}: ${i.product} (qty: ${i.quantity})`);
       } else {
         totalSold += i.quantity;
         itemsSold.push({ order: o.number, product: i.product, qty: i.quantity });
       }
    });
  });

  console.log(`\n--- Summary for GUSTAVO ---`);
  console.log(`Total Products Sold (non-reward): ${totalSold}`);
  console.log(`Total Rewards: ${rewardCount}`);
  console.log(`Total items that would appear in report if not filtered: ${totalSold + rewardCount}`);
};

main();
