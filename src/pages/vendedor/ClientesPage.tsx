import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { Users, Phone, Mail, MessageCircle, Search, Plus, MapPin, X, Eye, ShoppingCart } from 'lucide-react';
import type { Client } from '@/types/erp';

const ClientesPage: React.FC = () => {
  const { clients, orders, addClient } = useERP();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', cpfCnpj: '', phone: '', email: '', address: '', city: '', state: '', cep: '', notes: '' });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpfCnpj.includes(search)
  );

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
  };

  const handleCreate = () => {
    if (!form.name || !form.cpfCnpj) return;
    addClient({ id: `c${Date.now()}`, ...form, createdAt: new Date().toISOString() });
    setShowCreate(false);
    setForm({ name: '', cpfCnpj: '', phone: '', email: '', address: '', city: '', state: '', cep: '', notes: '' });
  };

  const clientOrders = selectedClient ? orders.filter(o => o.clientId === selectedClient.id) : [];

  if (selectedClient) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{selectedClient.name}</h1>
            <p className="page-subtitle font-mono">{selectedClient.cpfCnpj}</p>
          </div>
          <div className="flex gap-2">
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
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground">Informações</h3>
            <div className="space-y-3">
              {[
                { icon: Phone, label: selectedClient.phone },
                { icon: Mail, label: selectedClient.email },
                { icon: MapPin, label: `${selectedClient.address}, ${selectedClient.city}/${selectedClient.state}` },
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
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
                </div>
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

  if (showCreate) {
    return (
      <div className="space-y-6 animate-scale-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="page-header">Novo Cliente</h1><p className="page-subtitle">Cadastrar novo cliente</p></div>
          <button onClick={() => setShowCreate(false)} className="btn-modern bg-muted text-foreground shadow-none text-xs"><X className="w-4 h-4" /> Cancelar</button>
        </div>
        <div className="card-section p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Nome / Razão Social', placeholder: 'Nome completo', span: 2 },
              { key: 'cpfCnpj', label: 'CPF/CNPJ', placeholder: '000.000.000-00' },
              { key: 'phone', label: 'Telefone', placeholder: '(11) 99999-9999' },
              { key: 'email', label: 'Email', placeholder: 'email@exemplo.com' },
              { key: 'cep', label: 'CEP', placeholder: '00000-000' },
              { key: 'address', label: 'Endereço', placeholder: 'Rua, número', span: 2 },
              { key: 'city', label: 'Cidade', placeholder: 'Cidade' },
              { key: 'state', label: 'Estado', placeholder: 'UF' },
            ].map(field => (
              <div key={field.key} className={field.span === 2 ? 'md:col-span-2' : ''}>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">{field.label}</label>
                <input
                  type="text"
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="input-modern py-2.5"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Observações</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-modern min-h-[60px] resize-none" rows={2} />
            </div>
          </div>
          <button onClick={handleCreate} className="btn-primary" disabled={!form.name || !form.cpfCnpj}>
            <Plus className="w-4 h-4" /> Cadastrar Cliente
          </button>
        </div>
      </div>
    );
  }

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
        {filtered.map(client => (
          <div key={client.id} className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-start gap-4 cursor-pointer" onClick={() => setSelectedClient(client)}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-vendedor/20 to-vendedor/5 flex items-center justify-center shrink-0 text-vendedor font-bold text-sm">
                  {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm hover:text-primary transition-colors">{client.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{client.cpfCnpj}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{client.phone}</span>
                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{client.email}</span>
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
