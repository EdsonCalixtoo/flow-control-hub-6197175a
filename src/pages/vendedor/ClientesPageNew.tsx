import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useERP } from '@/contexts/ERPContext';
import { useThemeContext } from '@/contexts/ThemeContext';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Client } from '@/types/erp';

// ── Ícones inline ────────────────────────────────────────
const Icon = {
  Plus: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Trash: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  ),
  Edit: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  ),
  MapPin: () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  ),
  Phone: () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 010 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
    </svg>
  ),
  Mail: () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path strokeLinecap="round" d="M2 7l10 7 10-7" />
    </svg>
  ),
  User: () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Star: () => (
    <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
    </svg>
  ),
  History: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  WhatsApp: () => (
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  ),
  Cart: () => (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  External: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Spinner: () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" style={{ animation: 'cl-spin 1s linear infinite', display: 'inline-block' }}>
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
};

// ── Formatadores ──────────────────────────────────────────
const formatCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.length <= 10 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim() : d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
};
const formatCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
};

// ── Estado inicial do form ──────────────────────────────
const emptyForm = {
  name: '', cpfCnpj: '', email: '', phone: '',
  address: '', numero: '', complemento: '',
  bairro: '', city: '', state: 'SP', cep: '',
  notes: '', consignado: false,
};

// ── Componente principal ─────────────────────────────────
export default function ClientesPageNew() {
  const { clients, addClient, editClient, deleteClient } = useERP();
  const { theme } = useThemeContext();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Modo: null = oculto | 'new' = novo | string (id) = editando
  const [formMode, setFormMode] = useState<null | 'new' | string>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { orders } = useERP();
  const navigate = useNavigate();
  const location = useLocation();

  // ── Auto-busca via navegação ───────────────────────────
  useEffect(() => {
    const s = location.state as any;
    if (s?.search) {
      setSearch(s.search);
      // Se tiver um cliente com nome EXATO igual a busca, já abre ele
      const exact = clients.find(c => c.name.toLowerCase() === s.search.toLowerCase());
      if (exact) setSelectedClient(exact);
    }
  }, [location.state, clients]);

  // ── Abrir form novo ─────────────────────────────────────
  const openNew = () => {
    setForm(emptyForm);
    setError('');
    setFormMode('new');
  };

  // ── Abrir form edição ───────────────────────────────────
  const openEdit = (client: Client) => {
    // Tenta separar número/complemento do endereço se já tinha
    setForm({
      name: client.name || '',
      cpfCnpj: client.cpfCnpj || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      numero: '',
      complemento: '',
      bairro: client.bairro || '',
      city: client.city || '',
      state: client.state || 'SP',
      cep: client.cep || '',
      notes: client.notes || '',
      consignado: client.consignado || false,
    });
    setError('');
    setFormMode(client.id);
  };

  const closeForm = () => { setFormMode(null); setError(''); };

  // ── Handle Change com máscara ───────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    let formatted = value;
    if (name === 'cpfCnpj') formatted = formatCpfCnpj(value);
    if (name === 'phone') formatted = formatPhone(value);
    if (name === 'cep') formatted = formatCep(value);
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : formatted }));
  };

  // ── ViaCEP ──────────────────────────────────────────────
  const handleCepBlur = async () => {
    const digits = form.cep.replace(/\D/g, '');
    if (digits.length < 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const data = await res.json();
      if (data.erro) return;
      setForm(prev => ({ ...prev, address: data.logradouro || '', bairro: data.bairro || '', city: data.localidade || '', state: data.uf || 'SP' }));
    } catch { /* silencioso */ } finally { setCepLoading(false); }
  };

  // ── Submit (criar ou editar) ────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('⚠️ O nome do cliente é obrigatório.'); return; }
    if (!form.cpfCnpj || form.cpfCnpj.replace(/\D/g, '').length < 11) { setError('⚠️ CPF/CNPJ inválido (mínimo 11 dígitos).'); return; }
    if (!form.phone.trim()) { setError('⚠️ O telefone é obrigatório para contato.'); return; }
    if (!form.address.trim()) { setError('⚠️ O endereço (logradouro) é obrigatório para entregas.'); return; }
    if (!form.city.trim()) { setError('⚠️ A cidade é obrigatória.'); return; }
    if (!form.state.trim()) { setError('⚠️ O estado (UF) é obrigatório.'); return; }

    const fullAddress = form.numero
      ? `${form.address}, ${form.numero}${form.complemento ? ` - ${form.complemento}` : ''}`
      : form.address;

    try {
      setLoading(true);
      console.log('[ClientesPage] Iniciando salvamento...', form.name);

      const isEditing = formMode !== 'new';
      const now = new Date().toISOString();

      let clientToSave: Client;

      if (isEditing) {
        clientToSave = {
          id: formMode as string,
          name: form.name.trim(),
          cpfCnpj: form.cpfCnpj,
          email: form.email.trim(),
          phone: form.phone,
          address: fullAddress,
          bairro: form.bairro,
          city: form.city,
          state: form.state.toUpperCase(),
          cep: form.cep,
          notes: form.notes,
          consignado: form.consignado,
          createdBy: '',
          createdAt: now,
        };
      } else {
        clientToSave = {
          id: '',
          name: form.name.trim(),
          cpfCnpj: form.cpfCnpj,
          email: form.email.trim(),
          phone: form.phone,
          address: fullAddress,
          bairro: form.bairro,
          city: form.city,
          state: form.state.toUpperCase(),
          cep: form.cep,
          notes: form.notes,
          consignado: form.consignado,
          createdBy: '',
          createdAt: now,
        };
      }

      // Timeout de segurança para evitar carregamento infinito
      const savePromise = isEditing
        ? editClient(clientToSave)
        : addClient(clientToSave);

      await Promise.race([
        savePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido ao salvar (15s). Verifique sua conexão.')), 15000))
      ]);

      setSuccess(`✅ Cliente "${form.name}" ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
      console.log('[ClientesPage] Salvo com sucesso');
      closeForm();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error('[ClientesPage] Erro ao salvar:', err.message);
      setError(err.message || 'Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Remover "${clientName}"?`)) return;
    try {
      setDeleting(clientId);
      await deleteClient(clientId);
      setSuccess(`"${clientName}" removido!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao remover');
    } finally { setDeleting(null); }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.cpfCnpj?.includes(search) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const isEditing = formMode !== null && formMode !== 'new';

  return (
    <div className={`clientes-page-container ${isDark ? 'is-dark' : 'is-light'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        .clientes-page-container {
          min-height: 100vh;
          padding: 32px 24px;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          transition: all 0.3s ease;
        }
        
        /* Tema Escuro - Mantém o visual premium atual */
        .is-dark {
          background: linear-gradient(135deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%);
        }
        
        /* Tema Claro - Visual limpo e arejado */
        .is-light {
          background: #f8fafc;
        }

        .is-dark .cl-text-title { color: #fff; }
        .is-light .cl-text-title { color: #1e293b; }
        
        .is-dark .cl-text-subtitle { color: rgba(255,255,255,0.4); }
        .is-light .cl-text-subtitle { color: #64748b; }

        @keyframes cl-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cl-fadein { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        
        .cl-card { 
          background: ${isDark ? 'rgba(255,255,255,0.05)' : '#fff'}; 
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}; 
          border-radius: 16px; 
          backdrop-filter: blur(12px); 
          transition: all 0.25s ease; 
          box-shadow: ${isDark ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.1)'};
        }
        .cl-card:hover { 
          background: ${isDark ? 'rgba(255,255,255,0.08)' : '#fff'}; 
          border-color: #8b5cf6; 
          transform: translateY(-2px); 
          box-shadow: 0 10px 25px -5px ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)'}; 
        }
        
        .cl-form-card { 
          background: ${isDark ? 'rgba(255,255,255,0.05)' : '#fff'}; 
          border: 1px solid ${isDark ? 'rgba(139,92,246,0.3)' : '#8b5cf633'}; 
          border-radius: 16px; 
          backdrop-filter: blur(12px); 
          animation: cl-fadein 0.2s ease; 
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
        }
        
        .cl-input { 
          width: 100%; 
          background: ${isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}; 
          border: 1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}; 
          border-radius: 10px; 
          padding: 10px 14px; 
          color: ${isDark ? '#fff' : '#1e293b'}; 
          font-size: 14px; 
          outline: none; 
          transition: all 0.2s; 
          box-sizing: border-box; 
        }
        .cl-input::placeholder { color: ${isDark ? 'rgba(255,255,255,0.3)' : '#94a3b8'}; }
        .cl-input:focus { border-color: #8b5cf6; background: ${isDark ? 'rgba(139,92,246,0.08)' : '#fff'}; box-shadow: 0 0 0 3px rgba(139,92,246,0.15); }
        
        .cl-label { display: block; font-size: 11px; font-weight: 700; color: ${isDark ? 'rgba(255,255,255,0.5)' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        
        .cl-section { 
          background: ${isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'}; 
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'}; 
          border-radius: 12px; 
          padding: 18px; 
        }
        .cl-section-title { font-size:11px; font-weight:700; color:rgba(139,92,246,0.8); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
        .cl-section-title::after { content:''; flex:1; height:1px; background:rgba(139,92,246,0.2); }
        .cl-btn-primary { display:flex; align-items:center; gap:8px; padding:11px 22px; background:linear-gradient(135deg,#8b5cf6,#6366f1); border:none; border-radius:10px; color:#fff; font-weight:600; font-size:14px; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 15px rgba(139,92,246,0.35); }
        .cl-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(139,92,246,0.5); }
        .cl-btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .cl-btn-success { display:flex; align-items:center; gap:8px; padding:11px 26px; background:linear-gradient(135deg,#10b981,#059669); border:none; border-radius:10px; color:#fff; font-weight:600; font-size:14px; cursor:pointer; transition:all 0.2s; }
        .cl-btn-success:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(16,185,129,0.4); }
        .cl-btn-success:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .cl-btn-ghost { display:flex; align-items:center; gap:6px; padding:10px 16px; background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,255,255,0.12); border-radius:10px; color:rgba(255,255,255,0.7); font-weight:500; font-size:14px; cursor:pointer; transition:all 0.2s; }
        .cl-btn-ghost:hover { background:rgba(255,255,255,0.1); color:#fff; }
        .cl-btn-edit { display:flex; align-items:center; gap:5px; padding:7px 13px; background:rgba(99,102,241,0.12); border:1.5px solid rgba(99,102,241,0.3); border-radius:8px; color:#a5b4fc; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s; }
        .cl-btn-edit:hover { background:rgba(99,102,241,0.22); border-color:rgba(99,102,241,0.5); color:#c7d2fe; }
        .cl-btn-danger { display:flex; align-items:center; gap:5px; padding:7px 13px; background:rgba(239,68,68,0.1); border:1.5px solid rgba(239,68,68,0.25); border-radius:8px; color:#f87171; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s; }
        .cl-btn-danger:hover { background:rgba(239,68,68,0.2); border-color:rgba(239,68,68,0.5); }
        .cl-btn-danger:disabled { opacity:0.4; cursor:not-allowed; }
        .cl-alert-error { background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:12px 16px; color:#fca5a5; font-size:14px; margin-bottom:18px; }
        .cl-alert-success { background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:12px 16px; color:#6ee7b7; font-size:14px; margin-bottom:18px; }
        .cl-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; }
        .cl-cep-wrap { position:relative; }
        .cl-cep-spinner { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:#8b5cf6; }
        .cl-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .cl-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
        .cl-grid-4 { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:14px; }
        @media(max-width:640px) { .cl-grid-2,.cl-grid-3,.cl-grid-4{grid-template-columns:1fr;} }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="cl-text-title" style={{ fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>Meus Clientes</h1>
            <p className="cl-text-subtitle" style={{ marginTop: '3px', fontSize: '13px' }}>
              {clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}. Clique em um cliente para ver detalhes e histórico.
            </p>
          </div>
          {formMode === null && (
            <button className="cl-btn-primary" onClick={openNew}>
              <Icon.Plus /> Novo Cliente
            </button>
          )}
        </div>

        {/* Alertas */}
        {error && <div className="cl-alert-error">⚠️ {error}</div>}
        {success && <div className="cl-alert-success">{success}</div>}

        {/* ── Formulário (novo ou edição) ─── */}
        {formMode !== null && (
          <div className="cl-form-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 className="cl-text-title" style={{ fontSize: '17px', fontWeight: '700', margin: 0 }}>
                  {isEditing ? '✏️ Editar Cliente' : '➕ Novo Cliente'}
                </h2>
                <p className="cl-text-subtitle" style={{ fontSize: '12px', marginTop: '2px' }}>
                  {isEditing ? 'Altere os dados e clique em Salvar' : 'Preencha os dados. O CEP preenche o endereço automaticamente.'}
                </p>
              </div>
              <button className="cl-btn-ghost" onClick={closeForm} style={{ padding: '7px 11px' }} disabled={loading}>
                <Icon.X />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Dados Pessoais */}
              <div className="cl-section">
                <div className="cl-section-title">Dados Pessoais</div>
                <div className="cl-grid-2">
                  <div>
                    <label className="cl-label">Nome Completo *</label>
                    <input className="cl-input" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Nome do cliente" autoFocus />
                  </div>
                  <div>
                    <label className="cl-label">CPF / CNPJ *</label>
                    <input className="cl-input" type="text" name="cpfCnpj" value={form.cpfCnpj} onChange={handleChange} placeholder="000.000.000-00" maxLength={18} />
                  </div>
                </div>
                <div className="cl-grid-2" style={{ marginTop: '14px' }}>
                  <div>
                    <label className="cl-label">E-mail (Opcional)</label>
                    <input className="cl-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="Opcional" />
                  </div>
                  <div>
                    <label className="cl-label">Telefone / WhatsApp *</label>
                    <input className="cl-input" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" maxLength={15} />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="cl-section">
                <div className="cl-section-title">Endereço</div>
                <div style={{ maxWidth: '180px', marginBottom: '14px' }}>
                  <label className="cl-label">CEP</label>
                  <div className="cl-cep-wrap">
                    <input className="cl-input" type="text" name="cep" value={form.cep} onChange={handleChange} onBlur={handleCepBlur} placeholder="00000-000" maxLength={9} style={{ paddingRight: cepLoading ? '38px' : '14px' }} />
                    {cepLoading && <span className="cl-cep-spinner"><Icon.Spinner /></span>}
                  </div>
                </div>
                <div className="cl-grid-4" style={{ marginBottom: '14px' }}>
                  <div>
                    <label className="cl-label">Logradouro *</label>
                    <input className="cl-input" type="text" name="address" value={form.address} onChange={handleChange} placeholder="Rua, Av..." />
                  </div>
                  <div>
                    <label className="cl-label">Número</label>
                    <input className="cl-input" type="text" name="numero" value={form.numero} onChange={handleChange} placeholder="123" />
                  </div>
                  <div>
                    <label className="cl-label">Complemento</label>
                    <input className="cl-input" type="text" name="complemento" value={form.complemento} onChange={handleChange} placeholder="Apto..." />
                  </div>
                  <div>
                    <label className="cl-label">Bairro</label>
                    <input className="cl-input" type="text" name="bairro" value={form.bairro} onChange={handleChange} placeholder="Bairro" />
                  </div>
                </div>
                <div className="cl-grid-2">
                  <div>
                    <label className="cl-label">Cidade *</label>
                    <input className="cl-input" type="text" name="city" value={form.city} onChange={handleChange} placeholder="São Paulo" />
                  </div>
                  <div>
                    <label className="cl-label">UF *</label>
                    <input className="cl-input" type="text" name="state" value={form.state} onChange={handleChange} placeholder="SP" maxLength={2} style={{ textTransform: 'uppercase' }} />
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div className="cl-section">
                <div className="cl-section-title">Informações Adicionais</div>
                <textarea className="cl-input" name="notes" value={form.notes} onChange={handleChange} placeholder="Observações..." rows={2} style={{ resize: 'vertical' }} />
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="consignado" name="consignado" checked={form.consignado} onChange={handleChange}
                    style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }} />
                  <label htmlFor="consignado" className="cl-text-subtitle" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ color: '#fbbf24', marginRight: '4px' }}>⭐</span> Cliente Consignado
                  </label>
                </div>
              </div>

              {/* Botões */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
                <button type="submit" className="cl-btn-success" disabled={loading}>
                  {loading ? <><Icon.Spinner /> Salvando...</> : <><Icon.Check /> {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}</>}
                </button>
                <button type="button" className="cl-btn-ghost" onClick={closeForm} disabled={loading}>Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Busca */}
        {clients.length > 0 && (
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}>
              <Icon.Search />
            </span>
            <input className="cl-input" type="text" placeholder="Buscar por nome, CPF/CNPJ, telefone ou email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
          </div>
        )}

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="cl-card" style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '44px', marginBottom: '14px' }}>👥</div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>
              {search ? 'Nenhum cliente encontrado para essa busca' : 'Nenhum cliente cadastrado ainda'}
            </p>
            {!formMode && !search && (
              <button className="cl-btn-primary" onClick={openNew} style={{ margin: '16px auto 0', display: 'inline-flex' }}>
                <Icon.Plus /> Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(client => (
              <div
                key={client.id}
                className="cl-card"
                style={{ padding: '18px 22px', cursor: 'pointer' }}
                onClick={() => navigate(`/vendedor/clientes/${client.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>

                  {/* Avatar + Info */}
                  <div style={{ display: 'flex', gap: '14px', flex: 1, alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: '700', color: '#fff' }}>
                      {client.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 className="cl-text-title" style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{client.name}</h3>
                        {client.consignado && (
                          <span className="cl-badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                            <Icon.Star /> Consignado
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {client.cpfCnpj && (
                          <span className="cl-text-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <Icon.User /> {client.cpfCnpj}
                          </span>
                        )}
                        {client.phone && (
                          <span className="cl-text-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <Icon.Phone /> {client.phone}
                          </span>
                        )}
                        {client.email && (
                          <span className="cl-text-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <Icon.Mail /> {client.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button className="cl-btn-edit" onClick={() => openEdit(client)} title="Editar">
                      <Icon.Edit />
                    </button>
                    <button className="cl-btn-danger" onClick={() => handleDelete(client.id, client.name)} disabled={deleting === client.id} title="Excluir">
                      {deleting === client.id ? <Icon.Spinner /> : <Icon.Trash />}
                    </button>
                    {client.phone && (
                      <button
                        className="cl-btn-success"
                        style={{ padding: '7px 10px', background: '#25D366' }}
                        onClick={() => window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank')}
                        title="WhatsApp"
                      >
                        <Icon.WhatsApp />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
