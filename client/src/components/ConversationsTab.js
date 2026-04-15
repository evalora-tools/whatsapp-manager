import React from 'react';
import { supabase } from '../supabaseClient';
import { fetchClientDetailsByPhone } from '../services/dashboardDataService';

const ConversationsTab = ({
  conversations,
  loading,
  userId,
  onOpenConversation,
  onRefresh,
  filterResponses,
  onToggleFilter,
  onUpdateStatus,
  expandedCommentId,
  onToggleComment,
  onUpdateComment,
  selectionMode,
  selectedConversations,
  onToggleSelectionMode,
  onToggleConversationSelection,
  onSelectAll,
  onArchiveSelected,
  onUnarchiveSelected,
  showArchived,
  onToggleArchived
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedClientForDetails, setSelectedClientForDetails] = React.useState(null);
  const [clientDetails, setClientDetails] = React.useState(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleShowClientDetails = async (conversation) => {
    setSelectedClientForDetails(conversation);
    setLoadingDetails(true);

    try {
      // Extraer el número de teléfono del ID de la conversación
      const phoneNumber = conversation.id.replace('whatsapp:', '').replace('@c.us', '');

      const data = await fetchClientDetailsByPhone(supabase, userId, phoneNumber);
      setClientDetails(data);
    } catch (error) {
      console.error('Error fetching client details:', error);
      setClientDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseClientDetails = () => {
    setSelectedClientForDetails(null);
    setClientDetails(null);
  };

  // Filtrar conversaciones según el estado del filtro
  const filteredConversations = filterResponses
    ? conversations.filter(c => c.hasResponse)
    : conversations;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const conversationsWithResponses = conversations.filter(c => c.hasResponse).length;

  if (filteredConversations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {/* Header con botones siempre visible */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Conversaciones</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {showArchived ? 'Conversaciones archivadas' : 'Conversaciones activas'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>

          {/* Botones de filtro y selección */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={onToggleFilter}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${filterResponses
                    ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>{filterResponses ? 'Solo con respuestas' : 'Mostrar respuestas'}</span>
              </button>

              <button
                onClick={onToggleSelectionMode}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${selectionMode
                    ? 'bg-indigo-500 text-white shadow-md hover:bg-indigo-600'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>{selectionMode ? 'Cancelar selección' : 'Seleccionar'}</span>
              </button>

              <button
                onClick={onToggleArchived}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${showArchived
                    ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>{showArchived ? 'Ver activas' : 'Ver archivadas'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de vacío */}
        <div className="text-center py-16 px-6">
          <div className="max-w-sm mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {showArchived ? 'No hay conversaciones archivadas' : filterResponses ? 'No hay conversaciones con respuestas' : 'No hay conversaciones'}
            </h3>
            <p className="text-sm text-gray-500">
              {showArchived
                ? 'Aún no has archivado ninguna conversación.'
                : filterResponses
                  ? 'No hay conversaciones donde los clientes hayan respondido.'
                  : 'Las conversaciones aparecerán aquí cuando se reciban mensajes de tus clientes.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {/* Header con botón de refrescar y filtro */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Conversaciones</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {conversationsWithResponses > 0 && (
                <span className="font-semibold text-green-600">
                  {conversationsWithResponses} con respuesta{conversationsWithResponses !== 1 ? 's' : ''}
                </span>
              )}
              {conversationsWithResponses === 0 && 'Sin respuestas nuevas'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Botones de filtro y selección */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleFilter}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${filterResponses
                  ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>{filterResponses ? 'Solo con respuestas' : 'Mostrar respuestas'}</span>
              {filterResponses && conversationsWithResponses > 0 && (
                <span className="bg-white text-green-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {conversationsWithResponses}
                </span>
              )}
            </button>

            <button
              onClick={onToggleSelectionMode}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${selectionMode
                  ? 'bg-indigo-500 text-white shadow-md hover:bg-indigo-600'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>{selectionMode ? 'Cancelar selección' : 'Seleccionar'}</span>
            </button>

            <button
              onClick={onToggleArchived}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${showArchived
                  ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>{showArchived ? 'Ver activas' : 'Ver archivadas'}</span>
            </button>

            {filterResponses && (
              <span className="text-xs text-gray-600 animate-fadeIn">
                Mostrando {filteredConversations.length} de {conversations.length} conversaciones
              </span>
            )}
          </div>

          {/* Botones de acción cuando hay selección */}
          {selectionMode && selectedConversations.length > 0 && (
            <div className="flex items-center space-x-2 animate-fadeIn">
              <span className="text-sm text-gray-600 font-medium">
                {selectedConversations.length} seleccionada{selectedConversations.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onSelectAll(filteredConversations)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Seleccionar todas
              </button>
              {!showArchived ? (
                <button
                  onClick={onArchiveSelected}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <span>Archivar</span>
                </button>
              ) : (
                <button
                  onClick={onUnarchiveSelected}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>Desarchivar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              {selectionMode && (
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
                  <input
                    type="checkbox"
                    checked={selectedConversations.length === filteredConversations.length && filteredConversations.length > 0}
                    onChange={() => {
                      if (selectedConversations.length === filteredConversations.length) {
                        onSelectAll([]);
                      } else {
                        onSelectAll(filteredConversations);
                      }
                    }}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Conversación
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Detalles
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Última actualización
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Comentario
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <React.Fragment key={conversation.id}>
                <tr className={`transition-all duration-200 ${conversation.hasResponse
                    ? 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500'
                    : 'hover:bg-blue-50'
                  } ${selectedConversations.includes(conversation.id) ? 'ring-2 ring-indigo-500' : ''}`}>
                  {selectionMode && (
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={selectedConversations.includes(conversation.id)}
                        onChange={() => onToggleConversationSelection(conversation.id)}
                        className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center shadow-md relative ${conversation.hasResponse
                          ? 'bg-gradient-to-br from-green-400 to-green-600'
                          : 'bg-gradient-to-br from-blue-400 to-blue-600'
                        }`}>
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {conversation.hasResponse && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-semibold text-gray-900">
                            {conversation.title || 'Sin título'}
                          </div>
                          {conversation.hasResponse && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm animate-pulse">
                              ¡Respondió!
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{conversation.id.replace('whatsapp:', '').replace('@c.us', '')}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleShowClientDetails(conversation)}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Más detalles</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {(() => {
                          try {
                            if (conversation.ultimaActualizacion) {
                              const date = new Date(conversation.ultimaActualizacion);
                              if (!isNaN(date.getTime())) {
                                return date.toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              }
                            }
                            return new Date(conversation.updated_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch (e) {
                            return new Date(conversation.updated_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          }
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {conversation.comentario || expandedCommentId === conversation.id ? (
                      <div className="relative group">
                        <div className="flex items-center space-x-2 bg-yellow-50 border-2 border-yellow-300 rounded-lg px-3 py-2 min-w-[200px] max-w-xs">
                          <svg className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <input
                            type="text"
                            value={conversation.comentario || ''}
                            onChange={(e) => onUpdateComment(conversation.id, e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                            placeholder="Añadir comentario..."
                            autoFocus={expandedCommentId === conversation.id}
                          />
                          <button
                            onClick={() => {
                              if (conversation.comentario) {
                                onUpdateComment(conversation.id, '');
                              }
                              onToggleComment(null);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-600 hover:text-yellow-800"
                            title={conversation.comentario ? "Borrar comentario" : "Cerrar"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => onToggleComment(conversation.id)}
                        className="inline-flex items-center justify-center p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md bg-gray-100 hover:bg-gray-200 text-gray-600"
                        title="Añadir comentario"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onOpenConversation(conversation)}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      >
                        <span>Ver mensajes</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Botón Interesado */}
                      <button
                        onClick={() => onUpdateStatus(conversation.id, 'interesado')}
                        className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${conversation.estado === 'interesado'
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        title="Marcar como interesado"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>

                      {/* Botón Rechazado */}
                      <button
                        onClick={() => onUpdateStatus(conversation.id, 'rechazado')}
                        className={`inline-flex items-center justify-center p-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${conversation.estado === 'rechazado'
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        title="Marcar como rechazado"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalles del Cliente */}
      {selectedClientForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full animate-slideUp border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-indigo-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Detalles del Cliente</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {selectedClientForDetails.id.replace('whatsapp:', '').replace('@c.us', '')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseClientDetails}
                className="text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                </div>
              ) : clientDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Nombre Completo</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails['NOMBRE COMPLETO'] || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Nº Orden</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails['N ORDEN'] || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Contrato</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails.CONTRATO || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Servicio</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails.SERVICIO || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Teléfono</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails.TELEFONO || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Teléfono Fijo</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails['TELEFONO FIJO'] || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Dirección</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails.DIRECCION || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Código Postal</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails['CODIGO POSTAL'] || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Municipio</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">{clientDetails.MUNICIPIO || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Estado</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${clientDetails.ESTADO === 'ACTIVO'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {clientDetails.ESTADO || '-'}
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Estado Mensaje</label>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${clientDetails['ESTADO MENSAJE'] === 'ENVIADO'
                            ? 'bg-blue-100 text-blue-800'
                            : clientDetails['ESTADO MENSAJE'] === 'PENDIENTE'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          {clientDetails['ESTADO MENSAJE'] || '-'}
                        </span>
                      </p>
                    </div>
                    {clientDetails.FECHA && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Fecha</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {clientDetails.FECHA}
                        </p>
                      </div>
                    )}
                    {clientDetails['FECHA ENVIO PLANTILLA'] && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Fecha Envío Plantilla</label>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {clientDetails['FECHA ENVIO PLANTILLA']}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-base text-gray-900 font-semibold">No se encontró información del cliente</p>
                  <p className="mt-2 text-sm text-gray-600">Este número no está registrado en la base de datos de clientes</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t bg-gray-50">
              <button
                onClick={handleCloseClientDetails}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsTab;
