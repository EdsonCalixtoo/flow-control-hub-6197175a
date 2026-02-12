import React, { useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { formatCurrency } from '@/components/shared/StatusBadge';
import { Users, Phone, Mail, MessageCircle, Search, Plus, MapPin } from 'lucide-react';

const ClientesPage: React.FC = () => {
  const { clients } = useERP();
  const [search, setSearch] = useState('');

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpfCnpj.includes(search)
  );

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header">Clientes</h1>
          <p className="page-subtitle">{clients.length} clientes cadastrados</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-modern pl-11"
        />
      </div>

      <div className="grid gap-3 stagger-children">
        {filtered.map(client => (
          <div key={client.id} className="card-section p-5 hover:shadow-lg hover:shadow-primary/[0.04] hover:-translate-y-0.5 transition-all duration-300">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{client.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{client.cpfCnpj}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{client.phone}</span>
                    <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{client.email}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />{client.address}, {client.city}/{client.state}
                  </p>
                </div>
              </div>
              <button
                onClick={() => openWhatsApp(client.phone)}
                className="btn-modern bg-success/10 text-success hover:bg-success/20 shadow-none text-xs px-4 py-2"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientesPage;
