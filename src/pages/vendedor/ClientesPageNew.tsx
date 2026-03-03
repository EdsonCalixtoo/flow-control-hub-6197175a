import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { insertClientDirect, fetchUserClients, deleteClientById, type ClientResponse } from '@/services/clientServiceNew';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClientesPageNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    cpfCnpj: '',
    email: '',
    phone: '',
    address: '',
    bairro: '',
    city: '',
    state: 'SP',
    cep: '',
    notes: '',
    consignado: false,
  });

  // ─── Init ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      console.log('[ClientesPageNew] 🚀 Inicializando...');
      console.log('[ClientesPageNew] User do contexto:', user);

      if (!user?.id) {
        console.error('[ClientesPageNew] ❌ Sem autenticação!');
        navigate('/login');
        return;
      }

      console.log('[ClientesPageNew] ✅ User ID:', user.id);
      setUserId(user.id);

      // Load clients
      try {
        const userClients = await fetchUserClients(user.id);
        setClients(userClients);
        console.log('[ClientesPageNew] ✅ Clientes carregados:', userClients.length);
      } catch (err: any) {
        console.error('[ClientesPageNew] ❌ Erro ao carregar clientes:', err.message);
        setError(err.message);
      }
    };

    init();
  }, [user, navigate]);

  // ─── Handle Form Change ────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // ─── CEP Lookup (BrasilAPI) ─────────────────────────────
  const handleCepBlur = async () => {
    if (!form.cep || form.cep.length < 8) return;

    console.log('[ClientesPageNew] 🔍 Buscando CEP:', form.cep);
    
    try {
      const response = await fetch(`https://brasilapi.com.br/api/address/v2/${form.cep}`, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (!response.ok) {
        console.warn('[ClientesPageNew] ⚠️ CEP não encontrado');
        return;
      }

      const data = await response.json();
      console.log('[ClientesPageNew] ✅ CEP encontrado:', data);

      setForm(prev => ({
        ...prev,
        address: data.street || '',
        bairro: data.neighborhood || '',
        city: data.city || '',
        state: data.state || 'SP',
      }));
    } catch (err) {
      console.error('[ClientesPageNew] ❌ Erro ao buscar CEP:', err);
      // Não mostrar erro ao user, apenas não preenche
    }
  };

  // ─── Handle Submit ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    console.log('[ClientesPageNew] 📝 INICIANDO CADASTRO');

    // Validações básicas
    if (!form.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!form.cpfCnpj || form.cpfCnpj.replace(/\D/g, '').length < 11) {
      setError('CPF/CNPJ inválido (mínimo 11 dígitos)');
      return;
    }

    if (!userId) {
      setError('Erro: Você não está autenticado');
      return;
    }

    try {
      setLoading(true);
      console.log('[ClientesPageNew] 📤 Enviando para Supabase...');

      const response = await insertClientDirect(form, userId);
      
      console.log('[ClientesPageNew] ✅✅✅ SUCESSO!');
      setSuccess(`Cliente "${response.name}" cadastrado com sucesso!`);

      // Reload clients
      const userClients = await fetchUserClients(userId);
      setClients(userClients);

      // Reset form
      setForm({
        name: '',
        cpfCnpj: '',
        email: '',
        phone: '',
        address: '',
        bairro: '',
        city: '',
        state: 'SP',
        cep: '',
        notes: '',
        consignado: false,
      });

      setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ClientesPageNew] ❌ Erro:', err.message);
      setError(err.message || 'Erro ao cadastrar cliente');
    } finally {
      setLoading(false);
    }
  };

  // ─── Handle Delete ──────────────────────────────────────
  const handleDelete = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Tem certeza que quer deletar "${clientName}"?`)) {
      return;
    }

    try {
      setDeleting(clientId);
      console.log('[ClientesPageNew] 🗑️ Deletando:', clientId);

      await deleteClientById(clientId, userId);

      setClients(prev => prev.filter(c => c.id !== clientId));
      setSuccess(`"${clientName}" deletado com sucesso!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ClientesPageNew] ❌ Erro ao deletar:', err.message);
      setError(err.message || 'Erro ao deletar cliente');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meus Clientes</h1>
          <p className="text-gray-600 mt-2">Total: {clients.length} cliente(s)</p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Form Toggle Button */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="mb-6 bg-blue-600 hover:bg-blue-700">
            ➕ Novo Cliente
          </Button>
        )}

        {/* Form */}
        {showForm && (
          <Card className="p-6 mb-8 bg-white shadow-sm">
            <h2 className="text-xl font-bold mb-6">Cadastrar Novo Cliente</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <Input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CPF/CNPJ *
                  </label>
                  <Input
                    type="text"
                    name="cpfCnpj"
                    value={form.cpfCnpj}
                    onChange={handleChange}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    required
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Row 3 - CEP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <Input
                  type="text"
                  name="cep"
                  value={form.cep}
                  onChange={handleChange}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">Preencha para auto-completar endereço</p>
              </div>

              {/* Row 4 - Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <Input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Rua, Avenida, etc..."
                />
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bairro
                  </label>
                  <Input
                    type="text"
                    name="bairro"
                    value={form.bairro}
                    onChange={handleChange}
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <Input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="São Paulo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UF
                  </label>
                  <Input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Row 6 - Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

              {/* Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="consignado"
                  name="consignado"
                  checked={form.consignado}
                  onChange={handleChange}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="consignado" className="ml-2 text-sm text-gray-700 cursor-pointer">
                  Cliente Consignado
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? '⏳ Salvando...' : '✅ Cadastrar'}
                </Button>

                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  disabled={loading}
                >
                  ❌ Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Clients List */}
        <div className="grid grid-cols-1 gap-4">
          {clients.length === 0 ? (
            <Card className="p-8 text-center bg-gray-50">
              <p className="text-gray-600">Nenhum cliente cadastrado ainda</p>
            </Card>
          ) : (
            clients.map(client => (
              <Card key={client.id} className="p-4 bg-white shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{client.name}</h3>
                    <p className="text-sm text-gray-600">CPF/CNPJ: {client.cpf_cnpj}</p>
                    <p className="text-sm text-gray-600">Email: {client.email || '—'}</p>
                    <p className="text-sm text-gray-600">Telefone: {client.phone || '—'}</p>
                    {client.address && (
                      <p className="text-sm text-gray-600">
                        Endereço: {client.address}, {client.bairro} - {client.city}, {client.state}
                      </p>
                    )}
                    {client.notes && (
                      <p className="text-sm text-gray-600 mt-2">📝 {client.notes}</p>
                    )}
                    {client.consignado && (
                      <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                        ⭐ Consignado
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleDelete(client.id, client.name)}
                    disabled={deleting === client.id}
                    variant="outline"
                    className="ml-4 text-red-600 hover:bg-red-50 border-red-200"
                  >
                    {deleting === client.id ? '🗑️...' : '🗑️ Deletar'}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  Criado em: {new Date(client.created_at).toLocaleDateString('pt-BR')}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
