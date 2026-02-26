import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { Users, Phone, Mail, MessageCircle, Search, Plus, MapPin, X, Eye, ShoppingCart, Loader2, FileText } from 'lucide-react';
import type { Client } from '@/types/erp';
import { useNavigate } from 'react-router-dom';

// ─── Máscaras ────────────────────────────────────────────────
function maskCpfCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 123.456.789-09
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  // CNPJ: 12.345.678/0001-12
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

// ─── ViaCEP ──────────────────────────────────────────────────
async function fetchViaCep(cep: string) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return data as { logradouro: string; bairro: string; localidade: string; uf: string };
  } catch {
    return null;
  }
}

const EMPTY_FORM = { name: '', cpfCnpj: '', phone: '', email: '', logradouro: '', numero: '', complemento: '', bairro: '', city: '', state: '', cep: '', notes: '', consignado: false };

const ClientesPage: React.FC = () => {
  const { clients, orders, addClient } = useERP();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Combina logradouro + número + complemento em um único campo address
  const buildAddress = (f: typeof EMPTY_FORM) =>
    [f.logradouro, f.numero, f.complemento].filter(Boolean).join(', ');

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  // Isolamento de dados: vendedor vê apenas seus clientes
  const myClients = clients.filter(c =>
    user?.role !== 'vendedor' || (c as any).createdBy === user.id
  );

  const filtered = myClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpfCnpj.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
  );

  const openWhatsApp = (phone: string) =>
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');

  const handleCpfCnpj = (val: string) =>
    setForm(f => ({ ...f, cpfCnpj: maskCpfCnpj(val) }));

  const handlePhone = (val: string) =>
    setForm(f => ({ ...f, phone: maskPhone(val) }));

  const handleCep = async (val: string) => {
    const masked = maskCep(val);
    setForm(f => ({ ...f, cep: masked }));
    setCepError('');
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      const data = await fetchViaCep(masked);
      setCepLoading(false);
      if (data) {
        setForm(f => ({
          ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro: data.bairro || f.bairro,
          city: data.localidade,
          state: data.uf,
        }));
      } else {
        setCepError('CEP não encontrado');
      }
    }
  };

  const handleCreate = () => {
    if (!form.name || !form.cpfCnpj) return;
    const { logradouro, numero, complemento, ...rest } = form;
    addClient({
      id: crypto.randomUUID(),
      ...rest,
      address: buildAddress(form),
      bairro: form.bairro,
      consignado: form.consignado,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
    } as Client);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const clientOrders = selectedClient ? orders.filter(o => o.clientId === selectedClient.id) : [];

  // ── Detalhe do cliente ─────────────────────────────────────
  if (selectedClient) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{selectedClient.name}</h1>
            <p className="page-subtitle font-mono">{selectedClient.cpfCnpj}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/vendedor/orcamentos', { state: { clientId: selectedClient.id } })}
              className="btn-modern bg-primary/10 text-primary shadow-none text-xs hover:bg-primary/20"
            >
              <FileText className="w-4 h-4" /> Novo Orçamento
            </button>
            <button onClick={() => openWhatsApp(selectedClient.phone)} className="btn-modern bg-success/10 text-success shadow-none text-xs hover:bg-success/20">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
            <button onClick={() => setSelectedClient(null)} className="btn-modern bg-muted text-foreground shadow-none text-xs">
              <X className="w-4 h-4" /> Fechar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card-section p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Informações</h3>
              {selectedClient.consignado && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                  ⭐ Consignado
                </span>
              )}
            </div>
            <div className="space-y-3">
              {[
                { icon: Phone, label: selectedClient.phone || '—' },
                { icon: Mail, label: selectedClient.email || '—' },
                {
                  icon: MapPin, label: [
                    selectedClient.address,
                    selectedClient.bairro,
                    `${selectedClient.city}/${selectedClient.state}`
                  ].filter(Boolean).join(' — ')
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
            {selectedClient.notes && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-xs text-muted-foreground">
                {selectedClient.notes}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="card-section">
              <div className="card-section-header">
                <h3 className="card-section-title flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Histórico de Compras</h3>
                <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">{clientOrders.length} pedido(s)</span>
              </div>
              {clientOrders.length === 0 ? (
                <div className="p-8 text-center"><p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p></div>
              ) : (
                <table className="modern-table">
                  <thead><tr><th>Pedido</th><th className="text-right">Valor</th><th>Data</th></tr></thead>
                  <tbody>
                    {clientOrders.map(o => (
                      <tr key={o.id}>
                        <td className="font-bold text-foreground">{o.number}</td>
                        <td className="text-right font-semibold text-foreground">{formatCurrency(o.total)}</td>
                        <td className="text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulário de criação ──────────────────────────────────
  if (showCreate) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="page-header">Novo Cliente</h1><p className="page-subtitle">Cadastrar novo cliente</p></div>
          <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }} className="btn-modern bg-muted text-foreground shadow-none text-xs">
            <X className="w-4 h-4" /> Cancelar
          </button>
        </div>

        <div className="card-section p-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Nome / Razão Social *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo ou razão social" className="input-modern py-2.5" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPF/CNPJ com máscara automática */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">CPF / CNPJ *</label>
              <input
                type="text"
                value={form.cpfCnpj}
                onChange={e => handleCpfCnpj(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
                className="input-modern py-2.5 font-mono"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Máscara aplicada automaticamente (CPF ou CNPJ)</p>
            </div>

            {/* Telefone */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => handlePhone(e.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={15}
                className="input-modern py-2.5"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" className="input-modern py-2.5" />
            </div>

            {/* CEP com busca ViaCEP */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.cep}
                  onChange={e => handleCep(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  className="input-modern py-2.5 pr-10"
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                )}
              </div>
              {cepError && <p className="text-[10px] text-destructive mt-1">{cepError}</p>}
              {!cepError && form.cep.replace(/\D/g, '').length === 8 && !cepLoading && form.city && (
                <p className="text-[10px] text-success mt-1">✓ Endereço preenchido automaticamente</p>
              )}
            </div>
          </div>

          {/* Endereço: logradouro + número + complemento */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Logradouro (preenchido pelo CEP)</label>
            <input
              type="text"
              value={form.logradouro}
              onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
              placeholder="Rua / Av. / Travessa..."
              className="input-modern py-2.5"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Número *</label>
              <input
                type="text"
                value={form.numero}
                onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                placeholder="Ex: 123"
                className="input-modern py-2.5"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Complemento</label>
              <input
                type="text"
                value={form.complemento}
                onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))}
                placeholder="Apto, sala, bloco..."
                className="input-modern py-2.5"
              />
            </div>
          </div>

          {/* Bairro — campo novo */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Bairro</label>
            <input
              type="text"
              value={form.bairro}
              onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
              placeholder="Nome do bairro"
              className="input-modern py-2.5"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Cidade</label>
              <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cidade" className="input-modern py-2.5" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">UF</label>
              <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} className="input-modern py-2.5 uppercase" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-modern min-h-[60px] resize-none" rows={2} placeholder="Informações adicionais..." />
          </div>

          {/* Toggle Consignado */}
          <div
            onClick={() => setForm(f => ({ ...f, consignado: !f.consignado }))}
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 select-none ${form.consignado
              ? 'bg-amber-500/10 border-amber-500/40 shadow-inner'
              : 'bg-muted/30 border-border/30 hover:border-amber-500/30'
              }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-200 ${form.consignado ? 'bg-amber-500/20' : 'bg-muted'
              }`}>
              ⭐
            </div>
            <div className="flex-1">
              <p className={`font-bold text-sm ${form.consignado ? 'text-amber-400' : 'text-foreground'}`}>Cliente Consignado</p>
              <p className="text-xs text-muted-foreground mt-0.5">Marque se este cliente opera em regime de consignação</p>
            </div>
            {/* Switch visual */}
            <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${form.consignado ? 'bg-amber-500 justify-end' : 'bg-muted justify-start'
              }`}>
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </div>
          </div>

          <button onClick={handleCreate} className="btn-primary" disabled={!form.name || !form.cpfCnpj}>
            <Plus className="w-4 h-4" /> Cadastrar Cliente
          </button>
        </div>
      </div>
    );
  }

  // ── Lista de clientes ──────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Clientes</h1>
          <p className="page-subtitle">{clients.length} clientes cadastrados</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input type="text" placeholder="Buscar por nome ou CPF/CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="input-modern pl-11" />
      </div>

      <div className="grid gap-3 stagger-children">
        {filtered.length === 0 && (
          <div className="card-section p-10 text-center text-muted-foreground text-sm">Nenhum cliente encontrado</div>
        )}
        {filtered.map(client => (
          <div key={client.id} className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-start gap-4 cursor-pointer" onClick={() => setSelectedClient(client)}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vendedor/20 to-vendedor/5 flex items-center justify-center shrink-0 text-vendedor font-bold text-sm">
                  {client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm hover:text-primary transition-colors">{client.name}</p>
                    {client.consignado && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-500/20">
                        ⭐ Consignado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{client.cpfCnpj}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {client.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{client.phone}</span>}
                    {client.email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{client.email}</span>}
                    {client.city && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{client.city}/{client.state}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedClient(client)} className="btn-modern bg-primary/10 text-primary shadow-none text-xs px-3 py-2 hover:bg-primary/20">
                  <Eye className="w-3.5 h-3.5" /> Ver
                </button>
                <button onClick={() => openWhatsApp(client.phone)} className="btn-modern bg-success/10 text-success hover:bg-success/20 shadow-none text-xs px-3 py-2">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientesPage;
