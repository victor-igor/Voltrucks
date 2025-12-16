
import React, { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose }) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    telefone: '',
    empresa: '',
    email: '',
    endereco: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.nome_completo.trim()) {
      error('O nome completo é obrigatório.');
      return;
    }

    try {
      setLoading(true);

      const { error: insertError } = await supabase
        .from('contatos')
        .insert({
          nome_completo: formData.nome_completo,
          telefone: formData.telefone,
          empresa: formData.empresa,
          email: formData.email,
          observacoes: formData.endereco ? `Endereço: ${formData.endereco}` : null,
          status: 'Novo'
        });

      if (insertError) throw insertError;

      success('Contato adicionado com sucesso!');

      // Dispatch event to update list
      window.dispatchEvent(new Event('contactUpdated'));

      // Reset form
      setFormData({
        nome_completo: '',
        telefone: '',
        empresa: '',
        email: '',
        endereco: ''
      });

      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar contato:', err);
      error(err.message || 'Erro ao salvar contato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl w-full max-w-lg border border-border-light dark:border-border-dark flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border-light dark:border-border-dark">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Adicionar Novo Contato</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Nome Completo *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                name="nome_completo"
                value={formData.nome_completo}
                onChange={handleChange}
                className="block w-full pl-10 rounded-lg border-gray-300 dark:border-border-dark bg-gray-50 dark:bg-input-dark text-gray-900 dark:text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2.5 transition-colors"
                placeholder="Ex: Ana Carolina Souza"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Telefone / WhatsApp</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="block w-full pl-10 rounded-lg border-gray-300 dark:border-border-dark bg-gray-50 dark:bg-input-dark text-gray-900 dark:text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2.5 transition-colors"
                  placeholder="(00) 00000-0000"
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Empresa</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  className="block w-full pl-10 rounded-lg border-gray-300 dark:border-border-dark bg-gray-50 dark:bg-input-dark text-gray-900 dark:text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2.5 transition-colors"
                  placeholder="Nome da Empresa"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Email Corporativo</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 rounded-lg border-gray-300 dark:border-border-dark bg-gray-50 dark:bg-input-dark text-gray-900 dark:text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2.5 transition-colors"
                placeholder="email@empresa.com"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">Endereço</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-start pt-3 pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <textarea
                rows={3}
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                className="block w-full pl-10 rounded-lg border-gray-300 dark:border-border-dark bg-gray-50 dark:bg-input-dark text-gray-900 dark:text-white shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 py-2.5 transition-colors resize-none"
                placeholder="Rua, Número, Bairro - Cidade/UF"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-light dark:border-border-dark bg-gray-50 dark:bg-muted-dark/30 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-card-dark border border-gray-300 dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-muted-dark transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-black bg-primary rounded-lg hover:bg-primary/90 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Contato
          </button>
        </div>
      </div>
    </div>
  );
};
