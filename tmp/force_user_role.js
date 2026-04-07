import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const userId = 'dce55c12-c0fe-4494-b32e-bd98b80a20ff';
const newRole = 'producao_carenagem';

async function forceUserRole() {
  console.log(`Forcing user ${userId} to role ${newRole}...`);
  
  // Como não sabemos se o user existe na tabela 'users', vamos dar um UPSERT
  // mas como não temos email/name, vamos tentar ver se conseguimos pegar de algum lugar ou apenas inserir id/role
  
  const { data, error } = await supabase
    .from('users')
    .upsert({ 
       id: userId, 
       role: newRole,
       name: 'Produção Carenagem (Auto)', // Nome temporário se não existir
       email: 'carenagem@automatiza.com' // Email temporário se não existir
    }, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error forcing role:', error.message);
    
    // Se falhar por causa de RLS (o que é provável com a anon key), avisaremos o usuário.
    if (error.message.includes('row-level security') || error.code === '42501') {
        console.error('RLS Blocked the update. You need to run this SQL in the Supabase Dashboard SQL Editor:');
        console.log(`UPDATE public.users SET role = '${newRole}' WHERE id = '${userId}';`);
    }
  } else {
    console.log('Success! User record created/updated:', data);
  }
}

forceUserRole();
