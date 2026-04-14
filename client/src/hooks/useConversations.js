/**
 * useConversations — Hook de dominio para gestión de conversaciones.
 *
 * Encapsula:
 * - Carga inicial y recarga
 * - Estado de archivadas/activas
 * - Acciones de archivado masivo
 * - Actualización de estado (interesado/rechazado)
 * - Actualización de comentario CON DEBOUNCE para no saturar Supabase
 * - Gestión de selección múltiple
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { fetchConversationsWithStatus } from '../services/dashboardDataService';

const COMMENT_DEBOUNCE_MS = 600;

export const useConversations = (userId) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [showArchived, setShowArchived]   = useState(false);

  // Selección múltiple
  const [selectionMode, setSelectionMode]               = useState(false);
  const [selectedConversations, setSelectedConversations] = useState([]);

  // Filtro de respuestas
  const [filterResponses, setFilterResponses]   = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState(null);

  // Ref para timers de debounce por conversación
  const commentTimers = useRef({});

  // ─── Load ──────────────────────────────────────────────────────────────
  const loadConversations = useCallback(
    async (uid = userId) => {
      if (!uid) return;
      setError(null);
      try {
        const data = await fetchConversationsWithStatus(supabase, uid, showArchived);
        setConversations(data);
      } catch (err) {
        console.error('[useConversations] load error:', err);
        setError('No se pudieron cargar las conversaciones. Comprueba tu conexión.');
      } finally {
        setLoading(false);
      }
    },
    [userId, showArchived]
  );

  useEffect(() => {
    if (userId) {
      setLoading(true);
      loadConversations(userId);
    }
    // Limpiar selección al cambiar de vista
    setSelectedConversations([]);
    setSelectionMode(false);
  }, [userId, showArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Status ────────────────────────────────────────────────────────────
  const updateConversationStatus = useCallback(
    async (conversationId, newStatus) => {
      const currentConversation = conversations.find((c) => c.id === conversationId);
      const finalStatus = currentConversation?.estado === newStatus ? null : newStatus;

      // Optimistic update
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, estado: finalStatus } : c))
      );

      try {
        const { error } = await supabase
          .from('conversations')
          .update({ estado: finalStatus })
          .eq('id', conversationId);
        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.error('[useConversations] updateStatus error:', err);
        // Revert optimistic
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, estado: currentConversation?.estado ?? null } : c
          )
        );
        return { success: false, error: err.message };
      }
    },
    [conversations]
  );

  // ─── Comentario con debounce ───────────────────────────────────────────
  const updateComment = useCallback((conversationId, newComment) => {
    // Actualización local inmediata para UX fluida
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, comentario: newComment } : c))
    );

    // Cancelar timer pendiente para esta conversación
    if (commentTimers.current[conversationId]) {
      clearTimeout(commentTimers.current[conversationId]);
    }

    // Guardar en Supabase con debounce — evita un request por keystroke
    commentTimers.current[conversationId] = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ comentario: newComment })
          .eq('id', conversationId);
        if (error) {
          console.error('[useConversations] comment save error:', error);
          // No hacemos re-fetch completo — solo lo indicamos en error state
          setError('No se pudo guardar el comentario. Se reintentará al siguiente cambio.');
        }
      } catch (err) {
        console.error('[useConversations] comment save error:', err);
      }
    }, COMMENT_DEBOUNCE_MS);
  }, []);

  // ─── Comentario toggle ─────────────────────────────────────────────────
  const toggleComment = useCallback((conversationId) => {
    setExpandedCommentId((prev) => (prev === conversationId ? null : conversationId));
  }, []);

  // ─── Archivado masivo ──────────────────────────────────────────────────
  const archiveSelected = useCallback(async () => {
    if (selectedConversations.length === 0) return { success: false };
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ estado: 'archivada' })
        .in('id', selectedConversations);
      if (error) throw error;
      await loadConversations();
      setSelectedConversations([]);
      setSelectionMode(false);
      return { success: true };
    } catch (err) {
      console.error('[useConversations] archiveSelected error:', err);
      return { success: false, error: err.message };
    }
  }, [selectedConversations, loadConversations]);

  const unarchiveSelected = useCallback(async () => {
    if (selectedConversations.length === 0) return { success: false };
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ estado: null })
        .in('id', selectedConversations);
      if (error) throw error;
      await loadConversations();
      setSelectedConversations([]);
      setSelectionMode(false);
      return { success: true };
    } catch (err) {
      console.error('[useConversations] unarchiveSelected error:', err);
      return { success: false, error: err.message };
    }
  }, [selectedConversations, loadConversations]);

  // ─── Selección ─────────────────────────────────────────────────────────
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    setSelectedConversations([]);
  }, []);

  const toggleConversationSelection = useCallback((id) => {
    setSelectedConversations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAllConversations = useCallback((list) => {
    if (Array.isArray(list) && list.length > 0 && list[0]?.id) {
      setSelectedConversations(list.map((c) => c.id));
    } else {
      setSelectedConversations([]);
    }
  }, []);

  // ─── Toggles simples ───────────────────────────────────────────────────
  const toggleArchived      = useCallback(() => setShowArchived((v) => !v), []);
  const toggleFilterResponses = useCallback(() => setFilterResponses((v) => !v), []);
  const clearError          = useCallback(() => setError(null), []);

  return {
    // State
    conversations,
    loading,
    error,
    showArchived,
    filterResponses,
    expandedCommentId,
    selectionMode,
    selectedConversations,
    // Actions
    loadConversations,
    updateConversationStatus,
    updateComment,
    toggleComment,
    archiveSelected,
    unarchiveSelected,
    toggleSelectionMode,
    toggleConversationSelection,
    selectAllConversations,
    toggleArchived,
    toggleFilterResponses,
    clearError,
  };
};
