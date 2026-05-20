import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Download, 
  FileText, 
  TrendingDown,
  Users,
  Copy,
  Table as TableIcon,
  RefreshCw,
  Key,
  Factory,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ConciliationResult {
  name: string;
  email?: string;
  cpfCnpj?: string;
  date: string;
  amount?: number;
  status: 'missing' | 'found' | 'in_system' | 'picked_up';
  matchReason?: string;
  systemOrderNumber?: string;
}

export const DataRecoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [mercadoPagoRaw, setMercadoPagoRaw] = useState('');
  const [jadlogRaw, setJadlogRaw] = useState('');
  const [mpToken, setMpToken] = useState(import.meta.env.VITE_MP_ACCESS_TOKEN || '');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-05-31');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingMP, setIsFetchingMP] = useState(false);
  const [results, setResults] = useState<ConciliationResult[]>([]);
  const [strictMatch, setStrictMatch] = useState(true);
  const [comparisonBase, setComparisonBase] = useState<'payments' | 'orders'>('payments');
  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [deliveryPickups, setDeliveryPickups] = useState<any[]>([]);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);

  // Normaliza strings para comparação (remove acentos, espaços extras, etc)
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s]/gi, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, ' '); // Unifica espaços
  };

  // Parser robusto para dados colados de diversas fontes
  const parseData = (raw: string) => {
    if (!raw.trim()) return [];
    
    // Divide por linhas e limpa vazias
    const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return []; // Precisa de cabeçalho + 1 linha
    
    // Identifica o separador (tab é preferencial para Excel)
    const firstLine = lines[0];
    try {
      if (!raw.trim()) return [];
      
      const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return []; 
      
      const firstLine = lines[0];
      const isHeader = !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(firstLine); // Se não começa com data, assume que é cabeçalho
      
      let separator = /\t/; 
      if (!firstLine.includes('\t')) {
        if (firstLine.includes(';')) separator = /;/;
        else if (firstLine.includes(',')) separator = /,/;
        else separator = /\s{2,}/;
      }
      
      const headers = isHeader 
        ? firstLine.toLowerCase().split(separator).map(h => h.trim().replace(/["']/g, ''))
        : [];
      
      const dataRows = isHeader ? lines.slice(1) : lines;

      return dataRows.map(row => {
        const values = row.split(separator).map(v => v.trim().replace(/["']/g, ''));
        const obj: any = {};
        
        if (isHeader) {
          headers.forEach((h, i) => { if (values[i]) obj[h] = values[i]; });
        }

        // Busca Inteligente (Pattern Matching)
        // 1. Acha o CPF (11 ou 14 dígitos)
        const cpfValue = values.find(v => {
          const clean = v.replace(/\D/g, '');
          return clean.length === 11 || clean.length === 14;
        });
        if (cpfValue) obj.cpf_match = cpfValue.replace(/\D/g, '');

        // 2. Acha o Nome (Texto longo, sem números grandes, com espaços)
        const nameValue = values.find(v => 
          v.includes(' ') && 
          v.length > 5 && 
          !v.includes('@') && 
          !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(v) && // Não é data
          !/^\d{5,}/.test(v.replace(/\D/g, '')) // Não é número longo (CPF/CNPJ/CTE)
        );
        if (nameValue) obj.name_match = nameValue;

        // 3. Acha o Valor (Se houver)
        const amountValue = values.find(v => v.includes(',') && /^\d+/.test(v.replace('R$', '').trim()));
        if (amountValue) obj.amount_match = parseFloat(amountValue.replace('R$', '').replace(/\./g, '').replace(',', '.'));

        return obj;
      }).filter(o => o.name_match || o.cpf_match);
    } catch (e) {
      console.error('Erro no parser:', e);
      return [];
    }
  };

  const fetchMPPayments = async () => {
    if (!mpToken) {
      toast.error('Informe o Access Token do Mercado Pago.');
      return;
    }

    setIsFetchingMP(true);
    const toastId = toast.loading('Buscando pagamentos via API...');

    try {
      // Formatar datas para o formato ISO do MP (com timezone)
      const begin = `${startDate}T00:00:00.000-03:00`;
      const end = `${endDate}T23:59:59.000-03:00`;
      
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?begin_date=${begin}&end_date=${end}&status=approved&limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${mpToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro na API do Mercado Pago');
      }

      const data = await response.json();
      const payments = data.results || [];

      if (payments.length === 0) {
        toast.error('Nenhum pagamento aprovado encontrado nesse período.', { id: toastId });
        return;
      }

      // Converter formato API para formato de texto compatível com o parser existente
      // ou injetar diretamente no estado
      const tsvHeader = "Data\tNome\tValor\tEmail\tCPF\n";
      const tsvLines = payments.map((p: any) => {
        const fullDate = new Date(p.date_created);
        const dateStr = fullDate.toLocaleDateString('pt-BR');
        const timeStr = fullDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const name = p.payer?.first_name ? `${p.payer.first_name} ${p.payer.last_name || ''}` : p.description || 'N/A';
        const amount = p.transaction_amount;
        const email = p.payer?.email || '';
        const cpf = p.payer?.identification?.number || '';
        return `${dateStr} ${timeStr}\t${name}\t${amount}\t${email}\t${cpf}`;
      }).join('\n');

      setMercadoPagoRaw(tsvHeader + tsvLines);
      toast.success(`${payments.length} pagamentos importados com sucesso!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro na API: ' + err.message, { id: toastId });
    } finally {
      setIsFetchingMP(false);
    }
  };

  const fetchSystemOrders = async () => {
    setIsFetchingOrders(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('number, client_id, client_name, seller_name, status, total, created_at')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Busca CPFs dos clientes para cruzamento preciso
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, cpf_cnpj');

      const clientDocsMap: Record<string, string> = {};
      clientsData?.forEach(c => {
        const doc = (c as any).cpf_cnpj;
        if (doc) clientDocsMap[c.id] = String(doc).replace(/\D/g, '');
      });

      const ordersWithDocs = ordersData?.map(o => ({
        ...o,
        client_document: o.client_id ? clientDocsMap[o.client_id] : null
      }));

      setExistingOrders(ordersWithDocs || []);

      // Busca retiradas dos entregadores
      const { data: pickupsData } = await supabase
        .from('delivery_pickups')
        .select('*');
      
      setDeliveryPickups(pickupsData || []);

      toast.success(`${ordersData?.length || 0} pedidos e ${pickupsData?.length || 0} retiradas carregados.`);
    } catch (err: any) {
      toast.error('Erro ao buscar pedidos: ' + err.message);
    } finally {
      setIsFetchingOrders(false);
    }
  };

  const handleConciliate = () => {
    const hasMP = mercadoPagoRaw.trim().length > 0;
    const hasJadlog = jadlogRaw.trim().length > 0;
    const hasSystem = existingOrders.length > 0;

    if (comparisonBase === 'payments' && (!hasMP || !hasJadlog)) {
      toast.error('Para este modo, cole os dados do Mercado Pago e da Jadlog.');
      return;
    }

    if (comparisonBase === 'orders' && (!hasSystem || !hasJadlog)) {
      toast.error('Para este modo, sincronize a Produção e cole os dados da Jadlog.');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Cruzando informações...');

    try {
      const payments = parseData(mercadoPagoRaw);
      const shipments = parseData(jadlogRaw);
      const finalResults: ConciliationResult[] = [];

      // Define qual lista será a base do cruzamento
      const baseList = comparisonBase === 'payments' ? payments : existingOrders;

      baseList.forEach((item: any) => {
        let nameToMatch = '';
        let cpfToMatch = '';
        let dateToMatch = '';
        let amountToMatch = 0;
        let emailToMatch = '';
        let orderNum = '';

        if (comparisonBase === 'payments') {
          nameToMatch = item.name_match || (item['nome'] || item['pagador'] || item['cliente'] || item['name'] || Object.values(item)[1]) as string;
          cpfToMatch = item.cpf_match || String(item['cpf'] || item['documento'] || '').replace(/\D/g, '');
          dateToMatch = (item['data'] || item['date']) as string;
          amountToMatch = item.amount_match || parseFloat(String(item['valor'] || '0').replace('R$', '').replace(/\./g, '').replace(',', '.'));
          emailToMatch = item['email'] || item['e-mail'];
        } else {
          nameToMatch = item.client_name;
          cpfToMatch = item.client_document || '';
          dateToMatch = new Date(item.created_at).toLocaleDateString('pt-BR');
          amountToMatch = item.total;
          orderNum = item.number;
        }

        const normName = normalizeString(nameToMatch);
        if (!nameToMatch || nameToMatch.length < 2) return;

        // Procura na Jadlog
        const foundInJadlog = shipments.find(ship => {
          const destName = normalizeString(ship.name_match || String(
            ship['destinatário'] || ship['destinatario'] || ship['nome'] || ship['cliente'] ||
            Object.values(ship).find(v => typeof v === 'string' && v.length > 10) || ''
          ));
          const destCpf = (ship.cpf_match || String(
            ship['cpf'] || ship['cnpj'] || ship['cpf_cnpj_destinatario'] || ship['documento'] || ''
          )).replace(/\D/g, '');
          
          if (destCpf && cpfToMatch && destCpf === cpfToMatch) return true;
          return normName === destName || (normName.length > 5 && destName.includes(normName));
        });

        // Se a base for Pagamentos, procura também no Sistema
        let foundInSystem = null;
        if (comparisonBase === 'payments') {
           foundInSystem = existingOrders.find(ord => {
             const systemName = normalizeString(ord.client_name || '');
             return normName === systemName || (cpfToMatch && ord.client_document === cpfToMatch);
           });
        }

        // Busca nas Retiradas (Gestor)
        const foundInPickups = deliveryPickups.find(p => {
          if (orderNum && p.order_number === orderNum) return true;
          if (foundInSystem && p.order_id === foundInSystem.id) return true;
          return false;
        });

        let status: ConciliationResult['status'] = 'missing';
        let reason = 'Não encontrado';

        if (foundInJadlog) {
          status = 'found';
          reason = 'Já enviado (Jadlog)';
        } else if (foundInPickups) {
          status = 'picked_up';
          reason = `Retirado por: ${foundInPickups.deliverer_name}`;
        } else if (comparisonBase === 'payments' && foundInSystem) {
          status = 'in_system';
          reason = `Em produção (#${foundInSystem.number})`;
        } else if (comparisonBase === 'orders') {
          reason = 'Pendente de Envio';
        }

        finalResults.push({
          name: nameToMatch,
          email: emailToMatch,
          cpfCnpj: cpfToMatch,
          date: dateToMatch,
          amount: amountToMatch,
          status,
          matchReason: reason,
          systemOrderNumber: orderNum || foundInSystem?.number
        });
      });

      setResults(finalResults);
      toast.success('Conciliação concluída!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao processar dados: ' + err.message, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const missingOrders = useMemo(() => results.filter(r => r.status === 'missing'), [results]);
  const inSystemOrders = useMemo(() => results.filter(r => r.status === 'in_system'), [results]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/ti')} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
              Recuperação de Dados (Crash Recovery)
            </h1>
            <p className="text-muted-foreground">Cruzamento de Pagamentos vs Envios para identificação de pendências.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border/40">
           <span className="text-[10px] font-bold px-2 uppercase text-muted-foreground">Base:</span>
           <button 
             onClick={() => setComparisonBase('payments')}
             className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${comparisonBase === 'payments' ? 'bg-sky-500 text-white' : 'bg-background'}`}
           >
             Pagamentos
           </button>
           <button 
             onClick={() => setComparisonBase('orders')}
             className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${comparisonBase === 'orders' ? 'bg-emerald-600 text-white' : 'bg-background'}`}
           >
             Produção
           </button>
           <div className="w-[1px] h-4 bg-border/40 mx-1" />
           <span className="text-[10px] font-bold px-2 uppercase text-muted-foreground">Match:</span>
           <button 
             onClick={() => setStrictMatch(!strictMatch)}
             className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${strictMatch ? 'bg-rose-500 text-white' : 'bg-background'}`}
           >
             {strictMatch ? 'Rigoroso' : 'Flexível'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado A: Mercado Pago */}
        <div className="card-section p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sky-600">
              <TrendingDown className="w-5 h-5" />
              <h2 className="font-black uppercase tracking-tight">1. Pagamentos</h2>
            </div>
            <button 
              onClick={fetchMPPayments}
              disabled={isFetchingMP}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-[10px] font-bold hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              {isFetchingMP ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              BUSCAR API
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-1.5 rounded-lg bg-muted border border-border/40 text-[10px]" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-1.5 rounded-lg bg-muted border border-border/40 text-[10px]" />
          </div>
          <textarea
            value={mercadoPagoRaw}
            onChange={(e) => setMercadoPagoRaw(e.target.value)}
            placeholder="Data | Nome | Valor | Email..."
            className="w-full h-32 p-4 rounded-2xl bg-muted/30 border border-border/40 font-mono text-[10px] outline-none"
          />
          {mercadoPagoRaw && (
            <div className="text-[9px] p-2 bg-sky-500/5 rounded-lg border border-sky-500/10 space-y-1">
              <p><strong>Raio-X (MP):</strong> {parseData(mercadoPagoRaw).length} itens detectados.</p>
              <div className="flex gap-2 text-sky-600 font-bold">
                 <span>Nome: {parseData(mercadoPagoRaw)[0]?.nome || parseData(mercadoPagoRaw)[0]?.name || 'N/A'}</span>
                 <span>CPF: {parseData(mercadoPagoRaw)[0]?.cpf || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Lado B: Jadlog */}
        <div className="card-section p-6 space-y-4">
          <div className="flex items-center gap-3 text-indigo-600">
            <TableIcon className="w-5 h-5" />
            <h2 className="font-black uppercase tracking-tight">2. Envios Jadlog</h2>
          </div>
          <textarea
            value={jadlogRaw}
            onChange={(e) => setJadlogRaw(e.target.value)}
            placeholder="Data | Destinatário | CPF..."
            className="w-full h-32 p-4 rounded-2xl bg-muted/30 border border-border/40 font-mono text-[10px] outline-none"
          />
          {jadlogRaw && (
            <div className="text-[9px] p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10 space-y-1">
              <p><strong>Raio-X (Jadlog):</strong> {parseData(jadlogRaw).length} itens detectados.</p>
              <div className="flex gap-2 text-indigo-600 font-bold">
                 <span>Dest: {parseData(jadlogRaw)[0]?.destinatário || parseData(jadlogRaw)[0]?.destinatario || parseData(jadlogRaw)[0]?.destinatario || 'N/A'}</span>
                 <span>CPF: {parseData(jadlogRaw)[0]?.cpf || parseData(jadlogRaw)[0]?.cpf_cnpj_destinatario || parseData(jadlogRaw)[0]?.documento || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Lado C: Sistema */}
        <div className="card-section p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-emerald-600">
              <Factory className="w-5 h-5" />
              <h2 className="font-black uppercase tracking-tight">3. Pedidos no Sistema</h2>
            </div>
            <button 
              onClick={fetchSystemOrders}
              disabled={isFetchingOrders}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isFetchingOrders ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
              SINCRONIZAR PRODUÇÃO
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
             {existingOrders.length > 0 ? (
               <div className="flex items-center gap-3 text-emerald-600 font-bold text-xs">
                 <CheckCircle2 className="w-4 h-4" />
                 {existingOrders.length} pedidos carregados.
               </div>
             ) : (
               <p className="text-xs text-muted-foreground">Clique em SINCRONIZAR para carregar pedidos.</p>
             )}
             {deliveryPickups.length > 0 && (
               <div className="flex items-center gap-3 text-amber-600 font-bold text-xs">
                 <Database className="w-4 h-4" />
                 {deliveryPickups.length} retiradas (Relatório Gestor) carregadas.
               </div>
             )}
          </div>
          <div className="h-24 overflow-y-auto space-y-2 pr-2">
             {existingOrders.slice(0, 5).map((ord, i) => (
               <div key={i} className="text-[10px] p-2 bg-background border border-border/20 rounded-lg flex justify-between">
                 <span className="font-bold">#{ord.number} - {ord.client_name}</span>
                 <span className="text-muted-foreground">{ord.status}</span>
               </div>
             ))}
             {existingOrders.length > 5 && <p className="text-[9px] text-center text-muted-foreground">... e mais {existingOrders.length - 5} pedidos</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleConciliate}
          disabled={isProcessing}
          className="btn-primary !py-4 !px-12 !text-base shadow-xl shadow-primary/20 flex items-center gap-3"
        >
          {isProcessing ? 'PROCESSANDO...' : 'CRUZAR DADOS E IDENTIFICAR FALTAS'}
          <Search className="w-5 h-5" />
        </button>
      </div>

      {results.length > 0 && (
        <div className="card-section animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="card-section-header bg-muted/20 border-b border-border/40 p-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase">Resultado da Análise</h2>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-black text-foreground">{results.length}</span> {comparisonBase === 'payments' ? 'pagamentos' : 'pedidos'} processados.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="px-4 py-2 bg-success/5 border border-success/20 rounded-xl text-center">
                   <p className="text-[9px] font-black text-success uppercase">Jadlog</p>
                   <p className="text-sm font-black">{results.filter(r => r.status === 'found').length}</p>
                </div>
                <div className="px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center">
                   <p className="text-[9px] font-black text-amber-600 uppercase">Gestor</p>
                   <p className="text-sm font-black">{results.filter(r => r.status === 'picked_up').length}</p>
                </div>
                <div className="px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
                   <p className="text-[9px] font-black text-blue-600 uppercase">Produção</p>
                   <p className="text-sm font-black">{results.filter(r => r.status === 'in_system').length}</p>
                </div>
                <div className="px-4 py-2 bg-rose-500/5 border border-rose-500/20 rounded-xl text-center">
                   <p className="text-[9px] font-black text-rose-500 uppercase">Perdidos</p>
                   <p className="text-sm font-black text-rose-600">{missingOrders.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/10 border-b border-border/30">
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cliente (Pagamento)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Data / Valor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status de Envio</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Ação Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {results.map((res, idx) => (
                  <tr key={idx} className={`hover:bg-muted/20 transition-colors ${res.status === 'missing' ? 'bg-rose-500/[0.02]' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-foreground uppercase truncate max-w-[300px]">{res.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          {res.cpfCnpj ? `CPF: ${res.cpfCnpj}` : 'Sem CPF'}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{res.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-foreground">{res.date}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {res.amount ? res.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {res.status === 'found' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-[10px] font-black border border-success/20">
                            <CheckCircle2 className="w-3 h-3" /> JÁ ENVIADO
                          </span>
                        ) : res.status === 'in_system' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black border border-blue-500/20">
                            <Factory className="w-3 h-3" /> EM PRODUÇÃO
                          </span>
                        ) : res.status === 'picked_up' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20">
                            <Database className="w-3 h-3" /> RETIRADO P/ ENTREGA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-black border border-rose-500/20">
                            <AlertCircle className="w-3 h-3" /> PENDENTE / PERDIDO
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground italic">{res.matchReason}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {res.status === 'missing' ? (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(res.name);
                            toast.success('Nome copiado para busca!');
                          }}
                          className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/10"
                        >
                          COPIAR PARA BUSCA
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Tudo OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tutorial Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-section p-6 bg-muted/20 border-dashed border-border/60">
          <div className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center mb-4">
            <Copy className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-2">Como usar?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Abra seu relatório do Mercado Pago e da Jadlog no Excel ou no Navegador. Selecione as linhas e colunas, copie e cole nos campos acima. O sistema entende o formato automaticamente.
          </p>
        </div>
        <div className="card-section p-6 bg-muted/20 border-dashed border-border/60">
          <div className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-2">Busca Inteligente</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O sistema tenta casar os nomes mesmo se houver pequenas diferenças (ex: letras maiúsculas/minúsculas ou nomes parciais).
          </p>
        </div>
        <div className="card-section p-6 bg-muted/20 border-dashed border-border/60">
          <div className="w-10 h-10 rounded-2xl bg-background flex items-center justify-center mb-4">
            <Download className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-2">Dica de Segurança</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sempre inclua a primeira linha (cabeçalho) das suas tabelas para que o sistema identifique qual coluna é o nome e qual é a data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataRecoveryPage;
