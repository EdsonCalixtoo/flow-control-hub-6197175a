import { useState, useCallback } from 'react';

export interface ViaCepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  cep: string;
  erro?: boolean;
}

export const useViaCep = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchByCep = useCallback(async (cep: string): Promise<ViaCepData | null> => {
    if (!cep) {
      setError('CEP é obrigatório');
      return null;
    }

    // Remove formatação do CEP
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      setError('CEP deve ter 8 dígitos');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[ViaCep] 🔍 Buscando CEP:', cleanCep);

      // Delay pequeno para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 300));

      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: ViaCepData = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        console.log('[ViaCep] ❌ CEP não encontrado:', cleanCep);
        return null;
      }

      console.log('[ViaCep] ✅ CEP encontrado:', data);
      return data;
    } catch (err: any) {
      const message = err.message || 'Erro ao buscar CEP';
      setError(message);
      console.error('[ViaCep] ❌ Erro:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    searchByCep,
    clearError,
  };
};
