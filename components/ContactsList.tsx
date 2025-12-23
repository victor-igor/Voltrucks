
import React, { useState, useEffect } from 'react';
import { Search, Pencil, ChevronLeft, ChevronRight, Building2, UserPlus } from 'lucide-react';
import { listContacts, Contact } from '../lib/contacts';
import { useToast } from '../contexts/ToastContext';

interface ContactsListProps {
  onEdit?: (contactId: string) => void;
}

export const ContactsList: React.FC<ContactsListProps> = ({ onEdit }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const itemsPerPage = 10;

  const { error: toastError } = useToast();

  useEffect(() => {
    loadContacts();

    // Listen for contact updates
    const handleContactUpdate = () => {
      loadContacts();
    };

    window.addEventListener('contactUpdated', handleContactUpdate);

    return () => {
      window.removeEventListener('contactUpdated', handleContactUpdate);
    };
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await listContacts();
      console.log('Contacts Data Loaded:', data); // Debug: Check if fields exist
      if (data && data.length > 0) {
        console.log('Sample Contact:', data[0]);
      }
      setContacts(data);
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      console.error('Error details:', err.message, err.details, err.hint);
      toastError('Erro ao carregar contatos: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  // Filter contacts first
  const filteredContacts = contacts.filter(contact => {
    // Search filter
    const matchesSearch = contact.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.telefone && contact.telefone.includes(searchTerm)) ||
      (contact.empresa && contact.empresa.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'Todos') {
      const s = contact.status?.toLowerCase() || 'novo';
      if (statusFilter === 'Clientes') matchesStatus = s === 'cliente';
      else if (statusFilter === 'Leads') matchesStatus = s === 'lead' || s === 'novo';
      else if (statusFilter === 'Inativos') matchesStatus = s === 'inativo';
    }

    return matchesSearch && matchesStatus;
  });

  // Then paginate
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContacts = filteredContacts.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'cliente': return 'green';
      case 'negociação': return 'blue';
      case 'novo': return 'blue';
      case 'lead': return 'yellow';
      case 'inativo': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusStyle = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'blue': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'gray': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-grow w-full lg:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="block w-full pl-10 pr-3 py-2.5 border border-border-light dark:border-border-dark rounded-xl leading-5 bg-white dark:bg-input-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out shadow-sm"
            placeholder="Buscar por nome, empresa ou telefone..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['Todos', 'Clientes', 'Leads', 'Inativos'].map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setStatusFilter(filter);
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-sm text-center ${statusFilter === filter
                ? 'bg-primary/10 text-primary font-bold border border-primary/20'
                : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-muted-dark'
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-border-dark">
            <thead className="bg-gray-50 dark:bg-muted-dark/50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Nome do Contato</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Telefone</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Empresa</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Carregando contatos...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhum contato encontrado
                  </td>
                </tr>
              ) : (
                currentContacts.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50 dark:hover:bg-muted-dark/30 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{person.nome_completo}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{person.telefone || '-'}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {person.empresa || '-'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusStyle(getStatusColor(person.status))}`}>
                        {person.status || 'Novo'}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEdit && onEdit(person.id)}
                        className="text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary transition-colors p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-muted-dark"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border-light dark:border-border-dark bg-white dark:bg-card-dark px-4 py-3 sm:px-6 gap-3">
          <div className="w-full sm:hidden flex justify-between gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center justify-center flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center justify-center flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-400">
                Mostrando <span className="font-medium">{filteredContacts.length > 0 ? startIndex + 1 : 0}</span> a <span className="font-medium">{Math.min(endIndex, filteredContacts.length)}</span> de <span className="font-medium">{filteredContacts.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-border-light dark:ring-border-dark hover:bg-gray-50 dark:hover:bg-muted-dark focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                {/* Dynamically render page numbers could be better, but user asked for simple pagination for now */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Simple logic to show a window of pages around current, or just first 5 for simplicity if total is huge
                  // Integrating a simple sliding window would be better
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                  }
                  if (p > totalPages) return null;

                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      aria-current={currentPage === p ? 'page' : undefined}
                      className={`relative z-10 inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${currentPage === p
                        ? 'bg-primary text-white focus-visible:outline-primary'
                        : 'text-gray-900 ring-1 ring-inset ring-border-light hover:bg-gray-50 dark:text-white dark:hover:bg-muted-dark'
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-border-light dark:ring-border-dark hover:bg-gray-50 dark:hover:bg-muted-dark focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
