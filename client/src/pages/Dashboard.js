import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' o 'clients'
  const [conversations, setConversations] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientsPage, setClientsPage] = useState(1);
  const [hasMoreClients, setHasMoreClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingMoreClients, setLoadingMoreClients] = useState(false);
  const [totalClients, setTotalClients] = useState(0);
  const CLIENTS_PER_PAGE = 10;

  useEffect(() => {
    getUser();
    getConversations();
    getClients(1, '');
  }, []);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const getConversations = async () => {
    try {
      // Obtener el user_id del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id) // Filtrar por user_id
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClients = async (page = 1, search = '') => {
    try {
      // Obtener el user_id del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calcular el rango para la paginación
      const from = (page - 1) * CLIENTS_PER_PAGE;
      const to = from + CLIENTS_PER_PAGE - 1;
      
      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id); // Filtrar por user_id
      
      // Aplicar búsqueda si existe
      if (search.trim() !== '') {
        query = query.ilike('NOMBRE COMPLETO', `%${search}%`);
      }
      
      // Aplicar paginación y ordenar
      const { data, error, count } = await query
        .order('FECHA', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      // Si es página 1, reemplazar; si no, agregar
      if (page === 1) {
        setClients(data || []);
      } else {
        setClients(prev => [...prev, ...(data || [])]);
      }
      
      // Guardar el total de clientes
      setTotalClients(count || 0);
      
      // Verificar si hay más clientes
      setHasMoreClients((count || 0) > page * CLIENTS_PER_PAGE);
      
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
      setLoadingMoreClients(false);
    }
  };

  const handleLoadMoreClients = () => {
    setLoadingMoreClients(true);
    const nextPage = clientsPage + 1;
    setClientsPage(nextPage);
    getClients(nextPage, searchTerm);
  };

  const handleSearchClients = (search) => {
    setSearchTerm(search);
    setClientsPage(1);
    setLoading(true);
    getClients(1, search);
  };

  const getMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleOpenConversation = (conversation) => {
    setSelectedConversation(conversation);
    getMessages(conversation.id);
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
    setMessages([]);
  };

  const handleAddClient = async (clientData) => {
    try {
      // Obtener el user_id del usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      // Agregar el user_id a los datos del cliente
      const clientWithUserId = {
        ...clientData,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('clientes')
        .insert([clientWithUserId])
        .select();
      
      if (error) throw error;
      
      // Actualizar lista de clientes
      setClientsPage(1);
      setSearchTerm('');
      await getClients(1, '');
      setShowAddClientModal(false);
      
      return { success: true };
    } catch (error) {
      console.error('Error adding client:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">W</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">WhatsApp Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-white hover:bg-gray-50 text-primary-600 border border-primary-600 font-medium py-2 px-4 rounded-lg transition duration-300 text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('conversations')}
                  className={`${
                    activeTab === 'conversations'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Conversaciones ({conversations.length})</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('clients')}
                  className={`${
                    activeTab === 'clients'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Clientes ({totalClients})</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Content Area */}
          {activeTab === 'conversations' ? (
            <ConversationsTab 
              conversations={conversations}
              loading={loading}
              onOpenConversation={handleOpenConversation}
            />
          ) : (
            <ClientsTab 
              clients={clients}
              loading={loading}
              onAddClient={() => setShowAddClientModal(true)}
              onLoadMore={handleLoadMoreClients}
              hasMore={hasMoreClients}
              loadingMore={loadingMoreClients}
              searchTerm={searchTerm}
              onSearch={handleSearchClients}
            />
          )}
        </div>
      </main>

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <ConversationModal
          conversation={selectedConversation}
          messages={messages}
          loading={loadingMessages}
          onClose={handleCloseConversation}
        />
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <AddClientModal
          onClose={() => setShowAddClientModal(false)}
          onSave={handleAddClient}
        />
      )}
    </div>
  );
};

// Componente de Tab de Conversaciones
const ConversationsTab = ({ conversations, loading, onOpenConversation }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="card text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay conversaciones</h3>
        <p className="mt-1 text-sm text-gray-500">Las conversaciones aparecerán aquí cuando se reciban mensajes.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última actualización
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <tr key={conversation.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {conversation.title || 'Sin título'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {conversation.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(conversation.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(conversation.updated_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onOpenConversation(conversation)}
                    className="text-primary-600 hover:text-primary-900 font-medium"
                  >
                    Ver mensajes →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Componente de Tab de Clientes
const ClientsTab = ({ clients, loading, onAddClient, onLoadMore, hasMore, loadingMore, searchTerm, onSearch }) => {
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const handleSearchChange = (e) => {
    setLocalSearch(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearch('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Gestión de Clientes</h3>
          <p className="text-sm text-gray-500 mt-1">
            {clients.length > 0 ? `Mostrando ${clients.length} cliente${clients.length !== 1 ? 's' : ''}` : 'No hay clientes'}
            {searchTerm && ` con "${searchTerm}"`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscador */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              placeholder="Buscar por nombre..."
              className="w-full sm:w-64 pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>

          {/* Botón Añadir */}
          <button
            onClick={onAddClient}
            className="btn-primary flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Añadir Cliente</span>
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? `No se encontraron clientes con "${searchTerm}"` : 'No hay clientes'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Intenta con otro término de búsqueda' : 'Comienza añadiendo tu primer cliente.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={onAddClient}
                className="btn-primary inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir Cliente
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Servicio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado Mensaje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client['Nº ORDEN']} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {client['NOMBRE COMPLETO']?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {client['NOMBRE COMPLETO'] || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {client.MUNICIPIO || 'Sin ubicación'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.SERVICIO || '-'}</div>
                  <div className="text-sm text-gray-500">Contrato: {client.CONTRATO || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.TELEFONO || '-'}</div>
                  {client['TELEFONO FIJO'] && (
                    <div className="text-sm text-gray-500">Fijo: {client['TELEFONO FIJO']}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    client.ESTADO === 'ACTIVO' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client.ESTADO || 'Sin estado'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    client['ESTADO MENSAJE'] === 'ENVIADO' 
                      ? 'bg-blue-100 text-blue-800' 
                      : client['ESTADO MENSAJE'] === 'PENDIENTE'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {client['ESTADO MENSAJE'] || 'Sin enviar'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botón Cargar Más */}
      {hasMore && (
        <div className="mt-6 text-center border-t pt-6">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="btn-secondary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Cargar más clientes
              </>
            )}
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
};

// Modal de Conversación
const ConversationModal = ({ conversation, messages, loading, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {conversation.title || 'Conversación'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {conversation.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="mt-4 text-sm text-gray-700 font-medium">El cliente aún no ha respondido</p>
              <p className="mt-1 text-xs text-gray-500">La plantilla de contacto ha sido enviada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-semibold">
                        {message.sender_type === 'user' ? 'Usuario' : 'Asistente'}
                      </span>
                      {message.Respondido && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          ✓ Respondido
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_type === 'user' ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.created_at).toLocaleString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal para Añadir Cliente
const AddClientModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    'Nº ORDEN': '',
    'CONTRATO': '',
    'SERVICIO': '',
    'ESTADO': 'Pendiente de contactar con',
    'NOMBRE COMPLETO': '',
    'TELEFONO': '',
    'TELEFONO FIJO': '',
    'DIRECCION': '',
    'CODIGO POSTAL': '',
    'MUNICIPIO': ''
    // FECHA, FECHA ENVIO PLANTILLA y ESTADO MENSAJE se autogeneran en Supabase
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones básicas
    if (!formData['Nº ORDEN'] || !formData['NOMBRE COMPLETO']) {
      setError('El número de orden y el nombre son obligatorios');
      setLoading(false);
      return;
    }

    const result = await onSave(formData);
    
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Error al guardar el cliente');
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Añadir Nuevo Cliente</h3>
            <p className="text-sm text-gray-500 mt-1">Complete los datos del cliente</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nº ORDEN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nº Orden <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="Nº ORDEN"
                value={formData['Nº ORDEN']}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="123456"
              />
            </div>

            {/* NOMBRE COMPLETO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="NOMBRE COMPLETO"
                value={formData['NOMBRE COMPLETO']}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Juan Pérez García"
              />
            </div>

            {/* CONTRATO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contrato
              </label>
              <input
                type="text"
                name="CONTRATO"
                value={formData['CONTRATO']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="CTR-2025-001"
              />
            </div>

            {/* SERVICIO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servicio
              </label>
              <input
                type="text"
                name="SERVICIO"
                value={formData['SERVICIO']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Fibra 600Mb"
              />
            </div>

            {/* TELEFONO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="TELEFONO"
                value={formData['TELEFONO']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="612345678"
              />
            </div>

            {/* TELEFONO FIJO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono Fijo
              </label>
              <input
                type="tel"
                name="TELEFONO FIJO"
                value={formData['TELEFONO FIJO']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="912345678"
              />
            </div>

            {/* DIRECCION */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                name="DIRECCION"
                value={formData['DIRECCION']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Calle Principal 123, 2º A"
              />
            </div>

            {/* CODIGO POSTAL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Postal
              </label>
              <input
                type="number"
                name="CODIGO POSTAL"
                value={formData['CODIGO POSTAL']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="28001"
              />
            </div>

            {/* MUNICIPIO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Municipio
              </label>
              <input
                type="text"
                name="MUNICIPIO"
                value={formData['MUNICIPIO']}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Madrid"
              />
            </div>

            {/* ESTADO - No editable */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <input
                type="text"
                value={formData['ESTADO']}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este campo se establece automáticamente como "Pendiente de contactar con"
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;