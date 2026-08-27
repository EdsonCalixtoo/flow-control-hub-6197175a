import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useERP } from '@/contexts/ERPContext';
import { Order } from '@/types/erp';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Package, CheckCircle2, Truck, Calendar, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

// Helper inteligente para calcular o volume:
// - Se o pedido tem volumes definidos manualmente (ex: 5 caixas), usa o valor real.
// - Se o pedido tem apenas 1 volume (ou nenhum), usa a regra legada do Gestor de contar 'Kits' para manter o histórico correto.
const getVolumeCount = (pedido: Order): number => {
  if (pedido.volumes && pedido.volumes > 1) {
    return pedido.volumes;
  }
  let kits = 0;
  (pedido.items || []).forEach((item: any) => {
      const name = (item.product || item.name || '').toUpperCase();
      if (name.includes('KIT')) kits += Number(item.quantity || 1);
  });
  return kits > 0 ? kits : 1;
};

export default function EntregadorDashboard() {
  const { user } = useAuth();
  const { orders, barcodeScans, updateOrderStatus } = useERP();
  const [transportadora, setTransportadora] = useState<string>('JADLOG');
  const [pedidosParaColetar, setPedidosParaColetar] = useState<Order[]>([]);
  const [pedidosColetadosHoje, setPedidosColetadosHoje] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Lista simples de transportadoras. Pode ser substituída por uma tabela no banco se houver muitas.
  const transportadorasDisponiveis = [
    'JADLOG',
    'CORREIOS',
    'MOTOBOY',
    'AZUL CARGO',
    'BRASPRESS',
    'RETIRADA',
  ];

  useEffect(() => {
    setLoading(true);
    try {
      // 1. Apenas pedidos liberados e que tenham sido lidos pelo leitor de código de barras (barcode_scans)
      const paraColetar = orders.filter(o => {
        if (o.status !== 'produto_liberado') return false;
        if ((o.carrier || 'SEM TRANSPORTADORA').trim().toUpperCase() !== transportadora) return false;
        
        // Verifica se existe um scan válido para este pedido
        const foiBipado = barcodeScans.some(scan => scan.orderId === o.id && scan.success);
        return foiBipado;
      });

      // 2. Pedidos que foram retirados pela mesma transportadora (Histórico Completo)
      const coletados = orders.filter(o => {
        if (o.status !== 'retirado_entregador') return false;
        if ((o.carrier || 'SEM TRANSPORTADORA').trim().toUpperCase() !== transportadora) return false;
        return true;
      });

      setPedidosParaColetar(paraColetar.sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime()));
      setPedidosColetadosHoje(coletados.sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime()));
    } catch (err: any) {
      console.error('Erro ao processar pedidos:', err);
    } finally {
      setLoading(false);
    }
  }, [orders, barcodeScans, transportadora]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Painel do Entregador</h1>
            <p className="text-xs font-medium text-slate-500">Selecione sua transportadora e confira as coletas.</p>
          </div>
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-slate-400" />
            <Select value={transportadora} onValueChange={setTransportadora}>
              <SelectTrigger className="w-[140px] h-9 text-xs font-bold rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Transportadora" />
              </SelectTrigger>
              <SelectContent>
                {transportadorasDisponiveis.map(t => (
                  <SelectItem key={t} value={t} className="text-xs font-bold">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="pendentes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-2xl mb-6">
            <TabsTrigger 
              value="pendentes" 
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
            >
              Para Coletar
              {pedidosParaColetar.length > 0 && (
                <span className="ml-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {pedidosParaColetar.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="coletados"
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
            >
              Histórico de Coletas
            </TabsTrigger>
          </TabsList>
        
        <TabsContent value="pendentes" className="mt-6">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : pedidosParaColetar.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground">Tudo certo!</h3>
                <p>Nenhum pedido aguardando coleta para {transportadora}.</p>
              </CardContent>
            </Card>
          ) : (() => {
            const totalVolumes = pedidosParaColetar.reduce((acc, o) => acc + getVolumeCount(o), 0);
            
            return (
              <div className="space-y-6">
                {/* Resumo */}
                <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">Prontos para Coleta</h2>
                    <p className="text-blue-100 text-sm font-medium mt-1">
                      {transportadora} • Aguardando na expedição
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/20 px-4 py-2 rounded-xl text-center">
                      <span className="block text-2xl font-black">{pedidosParaColetar.length}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Pedidos</span>
                    </div>
                    <div className="bg-white/20 px-4 py-2 rounded-xl text-center">
                      <span className="block text-2xl font-black">{totalVolumes}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Volumes</span>
                    </div>
                  </div>
                </div>

                {/* Lista */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
                  {pedidosParaColetar.map(pedido => (
                    <div key={pedido.id} className="p-4 flex flex-col sm:flex-row justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-slate-900">#{pedido.number}</span>
                          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                            Aguardando
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-slate-600 line-clamp-1">{pedido.clientName}</p>
                        {pedido.customDeliveryAddress && (
                          <div className="flex items-start gap-1 mt-2 text-[10px] text-slate-500">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{pedido.customDeliveryAddress}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg h-fit w-fit shrink-0">
                        <Package className="w-4 h-4 text-slate-400" />
                        {getVolumeCount(pedido)} Vol.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="coletados" className="mt-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por pedido ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-white border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="h-10 bg-white border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (() => {
            const filteredColetados = pedidosColetadosHoje.filter(pedido => {
              let match = true;
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const isName = (pedido.clientName || '').toLowerCase().includes(term);
                const isNum = (pedido.number || '').toLowerCase().includes(term);
                if (!isName && !isNum) match = false;
              }
              if (filterDate) {
                const dateObj = new Date(pedido.updatedAt || pedido.createdAt);
                dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
                const dateStr = dateObj.toISOString().split('T')[0];
                if (dateStr !== filterDate) match = false;
              }
              return match;
            });

            if (filteredColetados.length === 0) {
              return (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium text-foreground">Nenhuma coleta encontrada</h3>
                    <p>Não há histórico de coletas que correspondam aos filtros para {transportadora}.</p>
                  </CardContent>
                </Card>
              );
            }

            // Agrupar por Data
            const groupedOrders = filteredColetados.reduce((acc, pedido) => {
              const dateObj = new Date(pedido.updatedAt || pedido.createdAt);
              dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
              const dateStr = dateObj.toISOString().split('T')[0];
              if (!acc[dateStr]) acc[dateStr] = [];
              acc[dateStr].push(pedido);
              return acc;
            }, {} as Record<string, Order[]>);

            const generatePDF = async (dateStr: string, ordersToExport: Order[]) => {
              try {
                const { jsPDF } = await import('jspdf');
                const doc = new jsPDF();
                
                doc.setFontSize(22);
                doc.text('Relatório de Coleta', 14, 20);
                
                doc.setFontSize(12);
                doc.text(`Transportadora: ${transportadora}`, 14, 30);
                const [year, month, day] = dateStr.split('-');
                doc.text(`Data da Coleta: ${day}/${month}/${year}`, 14, 36);
                doc.text(`Total de Pedidos: ${ordersToExport.length}`, 14, 42);
                
                let totalVolumes = 0;
                ordersToExport.forEach(o => { totalVolumes += getVolumeCount(o) });
                doc.text(`Total de Volumes: ${totalVolumes}`, 14, 48);

                let yPos = 60;
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('PEDIDO', 14, yPos);
                doc.text('CLIENTE', 45, yPos);
                doc.text('VOLS', 160, yPos);
                doc.text('HORA', 180, yPos);
                
                doc.line(14, yPos + 2, 196, yPos + 2);
                yPos += 8;
                
                doc.setFont('helvetica', 'normal');
                ordersToExport.forEach(pedido => {
                  if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                  }
                  const num = `#${pedido.number}`;
                  const cliente = pedido.clientName ? pedido.clientName.substring(0, 40) : '-';
                  const vols = `${getVolumeCount(pedido)}`;
                  const timeObj = new Date(pedido.updatedAt || pedido.createdAt);
                  const time = timeObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  
                  doc.text(num, 14, yPos);
                  doc.text(cliente, 45, yPos);
                  doc.text(vols, 160, yPos);
                  doc.text(time, 180, yPos);
                  
                  yPos += 8;
                });
                
                yPos += 20;
                if (yPos > 270) { doc.addPage(); yPos = 40; }
                doc.line(14, yPos, 80, yPos);
                doc.text('Assinatura do Entregador', 14, yPos + 5);
                
                doc.line(110, yPos, 196, yPos);
                doc.text('Assinatura do Responsável (Expedição)', 110, yPos + 5);
                
                doc.save(`Coleta_${transportadora}_${day}-${month}-${year}.pdf`);
                toast.success('Relatório gerado com sucesso!');
              } catch (error) {
                console.error('Erro ao gerar PDF:', error);
                toast.error('Não foi possível gerar o PDF.');
              }
            };

            return (
              <div className="space-y-8">
                {Object.entries(groupedOrders)
                  .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                  .map(([dateStr, ordersInDate]) => {
                    const [year, month, day] = dateStr.split('-');
                    const formattedDate = `${day}/${month}/${year}`;
                    const totalVols = ordersInDate.reduce((acc, o) => acc + getVolumeCount(o), 0);
                    
                    return (
                      <div key={dateStr} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              Coleta do dia {formattedDate}
                            </h2>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              {ordersInDate.length} pedidos • {totalVols} volumes totais
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white hover:bg-slate-50 text-xs font-bold border-slate-200 h-9"
                            onClick={() => generatePDF(dateStr, ordersInDate)}
                          >
                            Baixar Relatório (PDF)
                          </Button>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {ordersInDate.map(pedido => (
                            <div key={pedido.id} className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-black text-slate-900">#{pedido.number}</span>
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                    Coletado às {new Date(pedido.updatedAt || pedido.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </Badge>
                                </div>
                                <p className="text-xs font-medium text-slate-600 line-clamp-1">{pedido.clientName}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg h-fit w-fit shrink-0">
                                <Package className="w-4 h-4" />
                                {getVolumeCount(pedido)} Vol.
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                })}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
}
