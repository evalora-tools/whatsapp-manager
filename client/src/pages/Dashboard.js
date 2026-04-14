import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { fetchMessagesByConversation } from '../services/dashboardDataService';
import { useConversations } from '../hooks/useConversations';
import { useClients } from '../hooks/useClients';
import { useImportCSV } from '../hooks/useImportCSV';
import ConversationsTab from '../components/ConversationsTab';
import ClientsTab from '../components/ClientsTab';
import ConversationModal from '../components/ConversationModal';
import AddClientModal from '../components/AddClientModal';
import ImportCSVModal from '../components/ImportCSVModal';

// ─── Error Banner ──────────────────────────────────────────────────────────────
const ErrorBanner = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-fadeIn">
      <div className="flex items-start space-x-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-5 py-4 shadow-lg">
        <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 transition-colors"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // ─── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    }).catch((err) => {
      console.error('[Dashboard] getUser error:', err);
      setGlobalError('Error al verificar la sesión. Recarga la página.');
    });
  }, []);

  // ─── Hooks de dominio ────────────────────────────────────────────────────
  const conversations = useConversations(user?.id);
  const clients       = useClients(user?.id);
  const csvImport     = useImportCSV(user?.id, clients.resetAndReload);

  // Inicializar clientes cuando user esté disponible
  useEffect(() => {
    if (user?.id) {
      clients.loadClients(1, '', user.id);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Messages ────────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (conversationId) => {
    setLoadingMessages(true);
    try {
      const data = await fetchMessagesByConversation(supabase, conversationId);
      setMessages(data || []);
    } catch (err) {
      console.error('[Dashboard] loadMessages error:', err);
      setGlobalError('Error al cargar mensajes. Inténtalo de nuevo.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleOpenConversation = useCallback((conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  }, [loadMessages]);

  const handleCloseConversation = useCallback(() => {
    setSelectedConversation(null);
    setMessages([]);
  }, []);

  // ─── Sign out ────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ─── Global error display ────────────────────────────────────────────────
  const globalErrorMessage =
    globalError ||
    conversations.error ||
    clients.error ||
    null;

  const dismissGlobalError = useCallback(() => {
    setGlobalError(null);
    conversations.clearError();
    clients.clearError();
  }, [conversations, clients]);

  // ─── Loading state ───────────────────────────────────────────────────────
  const isInitialLoading = conversations.loading && clients.loading && !user;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50">
      {/* Error Banner global */}
      <ErrorBanner message={globalErrorMessage} onDismiss={dismissGlobalError} />

      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">WhatsApp Manager</h1>
                <p className="text-sm text-gray-500">Panel de Control</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">{user?.email}</span>
                <span className="text-xs text-gray-500">Administrador</span>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2.5 px-5 rounded-lg transition duration-300 text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Conversaciones */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Conversaciones</p>
                  <p className="text-3xl font-bold text-gray-900">{conversations.conversations.length}</p>
                  <p className="text-xs text-gray-500 mt-2">Activas en el sistema</p>
                </div>
                <div className="ml-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3">
              <button
                onClick={() => setActiveTab('conversations')}
                className="text-blue-700 text-sm font-semibold hover:text-blue-800 transition flex items-center space-x-1"
              >
                <span>Ver conversaciones</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Clientes */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">{clients.totalClients}</p>
                  <p className="text-xs text-gray-500 mt-2">Registrados en la base</p>
                </div>
                <div className="ml-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl p-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-3">
              <button
                onClick={() => setActiveTab('clients')}
                className="text-purple-700 text-sm font-semibold hover:text-purple-800 transition flex items-center space-x-1"
              >
                <span>Ver clientes</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Actividad */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Última Actividad</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {conversations.conversations.length > 0 ? 'Hoy' : '--'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {conversations.conversations.length > 0
                      ? new Date(conversations.conversations[0]?.updated_at).toLocaleDateString('es-ES')
                      : 'Sin actividad reciente'}
                  </p>
                </div>
                <div className="ml-4 bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-3">
              <div className="text-green-700 text-sm font-semibold flex items-center space-x-1">
                <span>Estado: Activo</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md p-2 mb-6 border border-gray-100">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'conversations'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Conversaciones</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'conversations' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                {conversations.conversations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'clients'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Clientes</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'clients' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-600'
              }`}>
                {clients.totalClients}
              </span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        {activeTab === 'conversations' ? (
          <ConversationsTab
            conversations={conversations.conversations}
            loading={conversations.loading}
            userId={user?.id}
            onOpenConversation={handleOpenConversation}
            onRefresh={conversations.loadConversations}
            filterResponses={conversations.filterResponses}
            onToggleFilter={conversations.toggleFilterResponses}
            onUpdateStatus={conversations.updateConversationStatus}
            expandedCommentId={conversations.expandedCommentId}
            onToggleComment={conversations.toggleComment}
            onUpdateComment={conversations.updateComment}
            selectionMode={conversations.selectionMode}
            selectedConversations={conversations.selectedConversations}
            onToggleSelectionMode={conversations.toggleSelectionMode}
            onToggleConversationSelection={conversations.toggleConversationSelection}
            onSelectAll={conversations.selectAllConversations}
            onArchiveSelected={conversations.archiveSelected}
            onUnarchiveSelected={conversations.unarchiveSelected}
            showArchived={conversations.showArchived}
            onToggleArchived={conversations.toggleArchived}
          />
        ) : (
          <ClientsTab
            clients={clients.clients}
            loading={clients.loading}
            onAddClient={() => setShowAddClientModal(true)}
            onLoadMore={clients.loadMoreClients}
            hasMore={clients.hasMoreClients}
            loadingMore={clients.loadingMore}
            searchTerm={clients.searchTerm}
            onSearch={clients.searchClients}
            onOpenImportModal={() => setShowImportModal(true)}
          />
        )}
      </div>

      {/* Conversation Modal */}
      {selectedConversation && (
        <ConversationModal
          conversation={selectedConversation}
          messages={messages}
          loading={loadingMessages}
          onClose={handleCloseConversation}
          onRefreshMessages={() => loadMessages(selectedConversation.id)}
        />
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <AddClientModal
          onClose={() => setShowAddClientModal(false)}
          onSave={clients.addClient}
        />
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportCSVModal
          onClose={() => {
            setShowImportModal(false);
            csvImport.resetImport();
          }}
          onFileSelect={csvImport.handleFileSelect}
          progress={csvImport.importProgress}
          onInsertValid={csvImport.insertValidClients}
          onDeleteDuplicates={csvImport.deleteDuplicatesAndInsert}
          pendingValidCount={csvImport.pendingValidClients.length}
          pendingDuplicatesCount={csvImport.pendingDuplicates.length}
        />
      )}
    </div>
  );
};

export default Dashboard;
