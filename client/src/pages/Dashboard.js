import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  fetchConversationsWithStatus,
  fetchClientsPage,
  fetchMessagesByConversation,
  fetchClientDetailsByPhone,
  fetchExistingClientsSnapshot,
} from '../services/dashboardDataService';
import {
  parseCsvText,
  buildColumnMapping,
  hasRequiredColumns,
  mapCsvRowToClient,
} from '../utils/csvImportUtils';
import ConversationsTab from '../components/ConversationsTab';
import ClientsTab from '../components/ClientsTab';
import ConversationModal from '../components/ConversationModal';
import AddClientModal from '../components/AddClientModal';
import ImportCSVModal from '../components/ImportCSVModal';

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
  const [filterResponses, setFilterResponses] = useState(false); // Nuevo estado para filtro
  const [expandedCommentId, setExpandedCommentId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false); // Modo de selección
  const [selectedConversations, setSelectedConversations] = useState([]); // IDs seleccionados
  const [showArchived, setShowArchived] = useState(false); // Mostrar archivadas
  const [showImportModal, setShowImportModal] = useState(false); // Modal de importación CSV
  const [importProgress, setImportProgress] = useState({ status: 'idle', message: '', details: null }); // idle, processing, success, error
  const [pendingDuplicates, setPendingDuplicates] = useState([]); // Clientes duplicados pendientes
  const [pendingValidClients, setPendingValidClients] = useState([]); // Clientes válidos pendientes de insertar
  const CLIENTS_PER_PAGE = 10;

  useEffect(() => {
    const initializeData = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      await Promise.all([
        getConversations(currentUser),
        getClients(1, '', currentUser)
      ]);
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recargar conversaciones cuando cambie el filtro de archivadas
  useEffect(() => {
    if (user?.id) {
      getConversations(user);
    }
    // Limpiar selección al cambiar de vista
    setSelectedConversations([]);
    setSelectionMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, user]);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    return user;
  };

  const getCurrentUser = async () => {
    if (user?.id) {
      return user;
    }

    return getUser();
  };

  const getConversations = async (currentUser = null) => {
    try {
      const activeUser = currentUser || (await getCurrentUser());
      if (!activeUser?.id) {
        return;
      }

      const conversationsWithStatus = await fetchConversationsWithStatus(supabase, activeUser.id, showArchived);
      setConversations(conversationsWithStatus);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getClients = async (page = 1, search = '', currentUser = null) => {
    try {
      const activeUser = currentUser || (await getCurrentUser());
      if (!activeUser?.id) {
        setClients([]);
        setHasMoreClients(false);
        setTotalClients(0);
        return;
      }
      
      const { data, count, hasMore } = await fetchClientsPage(
        supabase,
        activeUser.id,
        page,
        search,
        CLIENTS_PER_PAGE
      );
      
      // Si es página 1, reemplazar; si no, agregar
      if (page === 1) {
        setClients(data || []);
      } else {
        setClients(prev => [...prev, ...(data || [])]);
      }
      
      // Guardar el total de clientes
      setTotalClients(count || 0);
      
      // Verificar si hay más clientes sin depender de conteo exacto
      setHasMoreClients(hasMore);
      
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
      const data = await fetchMessagesByConversation(supabase, conversationId);
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
      const activeUser = await getCurrentUser();
      if (!activeUser?.id) {
        throw new Error('No se encontró un usuario autenticado');
      }
      
      // Agregar el user_id a los datos del cliente
      const clientWithUserId = {
        ...clientData,
        user_id: activeUser.id
      };

      const { error } = await supabase
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

  const handleUpdateConversationStatus = async (conversationId, newStatus) => {
    try {
      // Encontrar la conversación actual
      const currentConversation = conversations.find(conv => conv.id === conversationId);
      
      // Si el estado actual es el mismo que el nuevo, establecer a null
      const finalStatus = currentConversation?.estado === newStatus ? null : newStatus;
      
      const { error } = await supabase
        .from('conversations')
        .update({ estado: finalStatus })
        .eq('id', conversationId);
      
      if (error) throw error;
      
      // Actualizar el estado local
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, estado: finalStatus } : conv
      ));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating conversation status:', error);
      return { success: false, error: error.message };
    }
  };

  const handleToggleComment = (conversationId) => {
    setExpandedCommentId(expandedCommentId === conversationId ? null : conversationId);
  };

  const handleUpdateComment = async (conversationId, newComment) => {
    try {
      console.log('Actualizando comentario:', { conversationId, newComment });
      
      // Actualizar el estado local inmediatamente para mejor UX
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, comentario: newComment } : conv
      ));

      // Guardar en la base de datos
      const { data, error } = await supabase
        .from('conversations')
        .update({ comentario: newComment })
        .eq('id', conversationId)
        .select();
      
      if (error) {
        console.error('Error updating comment:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        // Revertir el cambio local si hay error
        await getConversations();
      } else {
        console.log('Comentario actualizado correctamente:', data);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      await getConversations();
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedConversations([]); // Limpiar selección al cambiar modo
  };

  const toggleConversationSelection = (conversationId) => {
    setSelectedConversations(prev => {
      if (prev.includes(conversationId)) {
        return prev.filter(id => id !== conversationId);
      } else {
        return [...prev, conversationId];
      }
    });
  };

  const selectAllConversations = (conversations) => {
    if (Array.isArray(conversations) && conversations.length > 0 && conversations[0]?.id) {
      const allIds = conversations.map(conv => conv.id);
      setSelectedConversations(allIds);
    } else {
      setSelectedConversations([]);
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedConversations.length === 0) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ estado: 'archivada' })
        .in('id', selectedConversations);

      if (error) throw error;

      // Recargar conversaciones y limpiar selección
      await getConversations();
      setSelectedConversations([]);
      setSelectionMode(false);
    } catch (error) {
      console.error('Error archiving conversations:', error);
      alert('Error al archivar conversaciones');
    }
  };

  const handleUnarchiveSelected = async () => {
    if (selectedConversations.length === 0) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ estado: null })
        .in('id', selectedConversations);

      if (error) throw error;

      // Recargar conversaciones y limpiar selección
      await getConversations();
      setSelectedConversations([]);
      setSelectionMode(false);
    } catch (error) {
      console.error('Error unarchiving conversations:', error);
      alert('Error al desarchivar conversaciones');
    }
  };

  const handleImportCSV = async (file) => {
    if (!file) return;

    setImportProgress({ status: 'processing', message: 'Procesando archivo...', details: null });

    try {
      const text = await file.text();
      const { separator, headers, rows } = parseCsvText(text);
      
      console.log(`Separador detectado: "${separator}"`);

      // Mapear columnas del CSV al esquema de Supabase
      // Detectamos las columnas por su contenido o nombre parcial
      const columnMapping = buildColumnMapping(headers);
      
      console.log('Encabezados CSV detectados:', headers);
      console.log('Primera fila de datos:', rows[0]);
      console.log('Mapeo de columnas generado:', columnMapping);
      
      // Mostrar columnas no mapeadas
      const unmappedHeaders = headers.filter(h => !columnMapping[h]);
      if (unmappedHeaders.length > 0) {
        console.log('Columnas no mapeadas:', unmappedHeaders);
      }
      
      // Verificar que se encontraron las columnas críticas
      const { hasNOrden, hasNombreCompleto } = hasRequiredColumns(columnMapping);
      
      console.log(`Columnas críticas encontradas - N ORDEN: ${hasNOrden}, NOMBRE COMPLETO: ${hasNombreCompleto}`);
      
      if (!hasNOrden || !hasNombreCompleto) {
        const errorMsg = `No se pudieron encontrar las columnas requeridas en el CSV.\n\nColumnas detectadas:\n${headers.map((h, i) => `${i + 1}. "${h}"`).join('\n')}\n\nFormatos soportados:\n1) Legacy: "Número" + "Cuenta: Nombre de la cuenta"\n2) Nuevo: "N ORDEN" + "nombre"`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Prueba: verificar la estructura de la tabla
      // Obtener el user_id del usuario autenticado
      const activeUser = await getCurrentUser();
      if (!activeUser?.id) {
        throw new Error('No se encontró un usuario autenticado');
      }

      // Obtener clientes existentes del usuario para validar duplicados
      const existingClients = await fetchExistingClientsSnapshot(supabase, activeUser.id);

      const existingOrders = new Set(existingClients?.map(c => c['N ORDEN']) || []);
      const existingPhones = new Set(existingClients?.map(c => c['TELEFONO']) || []);
      const existingNames = new Set(existingClients?.map(c => c['NOMBRE COMPLETO']?.trim().toLowerCase()) || []);

      // Transformar datos
      const clientsToInsert = [];
      const errors = [];
      const duplicates = [];
      const duplicatesData = []; // Guardar datos completos de duplicados

      console.log('Total de filas a procesar:', rows.length);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const client = { user_id: activeUser.id };

        // Mapear cada columna
        const mappedClient = mapCsvRowToClient(headers, row, columnMapping, activeUser.id);
        Object.assign(client, mappedClient);

        if (i === 0) {
          console.log(`Primera fila mapeada:`, client);
          console.log(`N ORDEN: ${client['N ORDEN']}, NOMBRE COMPLETO: ${client['NOMBRE COMPLETO']}`);
        }

        // Validar campos requeridos
        if (!client['N ORDEN'] || !client['NOMBRE COMPLETO']) {
          errors.push(`Fila ${i + 2}: Falta N° ORDEN o NOMBRE COMPLETO`);
          if (i < 5) { // Log solo primeras 5 filas con error
            console.log(`Error en fila ${i + 2}:`, {
              'N ORDEN': client['N ORDEN'],
              'NOMBRE COMPLETO': client['NOMBRE COMPLETO'],
              'Datos completos': client
            });
          }
          continue;
        }

        // Validar duplicados
        const orderNum = client['N ORDEN'];
        const phone = client['TELEFONO'];
        const name = client['NOMBRE COMPLETO']?.trim().toLowerCase();

        if (existingOrders.has(orderNum)) {
          duplicates.push(`Fila ${i + 2}: N° ORDEN ${orderNum} ya existe`);
          duplicatesData.push({ client, reason: 'N ORDEN', key: orderNum });
          console.log(`Duplicado en fila ${i + 2}: N° ORDEN ya existe`);
          continue;
        }

        if (phone && existingPhones.has(phone)) {
          duplicates.push(`Fila ${i + 2}: TELEFONO ${phone} ya existe`);
          duplicatesData.push({ client, reason: 'TELEFONO', key: phone });
          console.log(`Duplicado en fila ${i + 2}: TELEFONO ya existe`);
          continue;
        }

        if (name && existingNames.has(name)) {
          duplicates.push(`Fila ${i + 2}: Cliente "${client['NOMBRE COMPLETO']}" ya existe`);
          duplicatesData.push({ client, reason: 'NOMBRE COMPLETO', key: client['NOMBRE COMPLETO']?.trim() });
          console.log(`Duplicado en fila ${i + 2}: NOMBRE ya existe`);
          continue;
        }

        // Agregar a sets para validar duplicados dentro del mismo archivo
        existingOrders.add(orderNum);
        if (phone) existingPhones.add(phone);
        if (name) existingNames.add(name);

        clientsToInsert.push(client);
      }

      // NO insertar automáticamente - guardar para que el usuario decida
      // Guardar clientes válidos pendientes
      setPendingValidClients(clientsToInsert);
      
      // Guardar duplicados pendientes para posible eliminación
      setPendingDuplicates(duplicatesData);

      // Mostrar resumen con opciones
      setImportProgress({
        status: 'success',
        message: `Análisis del CSV completado`,
        details: {
          total: rows.length,
          validCount: clientsToInsert.length,
          duplicates: duplicates.length,
          errors: errors.length,
          duplicatesList: duplicates,
          errorsList: errors,
          hasPendingDuplicates: duplicatesData.length > 0,
          hasPendingValid: clientsToInsert.length > 0,
          inserted: 0
        }
      });

    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportProgress({
        status: 'error',
        message: 'Error al importar el archivo',
        details: { error: error.message }
      });
    }
  };

  // Función para insertar solo los clientes válidos (no duplicados)
  const handleInsertValidClients = async () => {
    if (pendingValidClients.length === 0) return;

    setImportProgress({ status: 'processing', message: 'Insertando clientes...', details: null });

    try {
      const { data, error: insertError } = await supabase
        .from('clientes')
        .insert(pendingValidClients)
        .select();

      if (insertError) {
        console.error('Error insertando clientes:', insertError);
        throw insertError;
      }

      const insertedCount = data?.length || 0;

      // Recargar lista de clientes
      await getClients(1, '');

      // Limpiar pendientes
      setPendingValidClients([]);
      setPendingDuplicates([]);

      // Mostrar resumen final
      setImportProgress({
        status: 'success',
        message: `Importación completada`,
        details: {
          total: insertedCount,
          inserted: insertedCount,
          duplicates: 0,
          errors: 0,
          duplicatesList: [],
          errorsList: [],
          hasPendingDuplicates: false,
          hasPendingValid: false
        }
      });

    } catch (error) {
      console.error('Error insertando clientes:', error);
      setImportProgress({
        status: 'error',
        message: 'Error al insertar clientes',
        details: { error: error.message }
      });
    }
  };

  const handleDeleteDuplicatesAndInsert = async () => {
    if (pendingDuplicates.length === 0) return;

    setImportProgress({ status: 'processing', message: 'Eliminando duplicados e insertando nuevos...', details: null });

    try {
      const activeUser = await getCurrentUser();
      if (!activeUser?.id) {
        throw new Error('No se encontró un usuario autenticado');
      }
      
      let deletedCount = 0;
      let insertedCount = 0;
      const errors = [];

      // Agrupar duplicados por tipo
      const uniqueOrderKeys = [...new Set(
        pendingDuplicates
          .filter(d => d.reason === 'N ORDEN')
          .map(d => d.key)
          .filter(key => key !== null && key !== undefined)
      )];
      const uniquePhoneKeys = [...new Set(
        pendingDuplicates
          .filter(d => d.reason === 'TELEFONO')
          .map(d => d.key)
          .filter(key => key !== null && key !== undefined)
      )];
      const uniqueNameKeys = [...new Set(
        pendingDuplicates
          .filter(d => d.reason === 'NOMBRE COMPLETO')
          .map(d => d.key)
          .filter(Boolean)
      )];

      if (uniqueOrderKeys.length > 0) {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('user_id', activeUser.id)
          .in('N ORDEN', uniqueOrderKeys);

        if (error) {
          console.error('Error eliminando por N ORDEN:', error);
          errors.push(`Error eliminando duplicados por N ORDEN: ${error.message}`);
        } else {
          deletedCount += uniqueOrderKeys.length;
        }
      }

      if (uniquePhoneKeys.length > 0) {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('user_id', activeUser.id)
          .in('TELEFONO', uniquePhoneKeys);

        if (error) {
          console.error('Error eliminando por TELEFONO:', error);
          errors.push(`Error eliminando duplicados por TELEFONO: ${error.message}`);
        } else {
          deletedCount += uniquePhoneKeys.length;
        }
      }

      if (uniqueNameKeys.length > 0) {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('user_id', activeUser.id)
          .in('NOMBRE COMPLETO', uniqueNameKeys);

        if (error) {
          console.error('Error eliminando por NOMBRE:', error);
          errors.push(`Error eliminando duplicados por NOMBRE COMPLETO: ${error.message}`);
        } else {
          deletedCount += uniqueNameKeys.length;
        }
      }

      // Insertar todos los clientes: duplicados (que reemplazan) + válidos pendientes
      const duplicateClients = pendingDuplicates.map(d => d.client);
      const allClientsToInsert = [...duplicateClients, ...pendingValidClients];
      
      if (allClientsToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from('clientes')
          .insert(allClientsToInsert)
          .select();

        if (insertError) {
          console.error('Error insertando clientes:', insertError);
          errors.push(`Error insertando: ${insertError.message}`);
        } else {
          insertedCount = data?.length || 0;
        }
      }

      // Recargar lista de clientes
      await getClients(1, '');

      // Limpiar pendientes
      setPendingDuplicates([]);
      setPendingValidClients([]);

      // Mostrar resumen
      setImportProgress({
        status: 'success',
        message: `Importación completada (con reemplazo de duplicados)`,
        details: {
          total: allClientsToInsert.length,
          deleted: deletedCount,
          inserted: insertedCount,
          duplicates: 0,
          errors: errors.length,
          duplicatesList: [],
          errorsList: errors,
          hasPendingDuplicates: false,
          hasPendingValid: false
        }
      });

    } catch (error) {
      console.error('Error en eliminación de duplicados:', error);
      setImportProgress({
        status: 'error',
        message: 'Error al eliminar duplicados',
        details: { error: error.message }
      });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'))) {
      handleImportCSV(file);
    } else {
      alert('Por favor selecciona un archivo CSV válido');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50">
      {/* Header Mejorado */}
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

      {/* Estadísticas */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card Conversaciones */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Conversaciones</p>
                  <p className="text-3xl font-bold text-gray-900">{conversations.length}</p>
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

          {/* Card Clientes */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">{totalClients}</p>
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

          {/* Card Actividad */}
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Última Actividad</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {conversations.length > 0 ? 'Hoy' : '--'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {conversations.length > 0 
                      ? new Date(conversations[0]?.updated_at).toLocaleDateString('es-ES')
                      : 'Sin actividad reciente'
                    }
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

        {/* Tabs Mejorados */}
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
                activeTab === 'conversations' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {conversations.length}
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
                activeTab === 'clients' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-purple-100 text-purple-600'
              }`}>
                {totalClients}
              </span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        {activeTab === 'conversations' ? (
          <ConversationsTab 
            conversations={conversations}
            loading={loading}
            userId={user?.id}
            onOpenConversation={handleOpenConversation}
            onRefresh={getConversations}
            filterResponses={filterResponses}
            onToggleFilter={() => setFilterResponses(!filterResponses)}
            onUpdateStatus={handleUpdateConversationStatus}
            expandedCommentId={expandedCommentId}
            onToggleComment={handleToggleComment}
            onUpdateComment={handleUpdateComment}
            selectionMode={selectionMode}
            selectedConversations={selectedConversations}
            onToggleSelectionMode={toggleSelectionMode}
            onToggleConversationSelection={toggleConversationSelection}
            onSelectAll={selectAllConversations}
            onArchiveSelected={handleArchiveSelected}
            onUnarchiveSelected={handleUnarchiveSelected}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived(!showArchived)}
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
            onOpenImportModal={() => setShowImportModal(true)}
          />
        )}
      </div>

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <ConversationModal
          conversation={selectedConversation}
          messages={messages}
          loading={loadingMessages}
          onClose={handleCloseConversation}
          onRefreshMessages={() => getMessages(selectedConversation.id)}
        />
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <AddClientModal
          onClose={() => setShowAddClientModal(false)}
          onSave={handleAddClient}
        />
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportCSVModal
          onClose={() => {
            setShowImportModal(false);
            setImportProgress({ status: 'idle', message: '', details: null });
            setPendingDuplicates([]);
            setPendingValidClients([]);
          }}
          onFileSelect={handleFileSelect}
          progress={importProgress}
          onInsertValid={handleInsertValidClients}
          onDeleteDuplicates={handleDeleteDuplicatesAndInsert}
          pendingValidCount={pendingValidClients.length}
          pendingDuplicatesCount={pendingDuplicates.length}
        />
      )}
    </div>
  );
};

export default Dashboard;
