/**
 * useClients — Hook de dominio para gestión de clientes.
 *
 * Encapsula:
 * - Paginación y búsqueda
 * - Añadir cliente manual
 * - Refresh de lista
 */
import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { fetchClientsPage } from '../services/dashboardDataService';

const CLIENTS_PER_PAGE = 10;

export const useClients = (userId) => {
  const [clients, setClients]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [error, setError]                   = useState(null);
  const [totalClients, setTotalClients]     = useState(0);
  const [hasMoreClients, setHasMoreClients] = useState(false);
  const [clientsPage, setClientsPage]       = useState(1);
  const [searchTerm, setSearchTerm]         = useState('');

  // ─── Load page ─────────────────────────────────────────────────────────
  const loadClients = useCallback(
    async (page = 1, search = '', uid = userId) => {
      if (!uid) {
        setClients([]);
        setHasMoreClients(false);
        setTotalClients(0);
        return;
      }
      setError(null);
      try {
        const { data, count, hasMore } = await fetchClientsPage(
          supabase,
          uid,
          page,
          search,
          CLIENTS_PER_PAGE
        );

        if (page === 1) {
          setClients(data || []);
        } else {
          setClients((prev) => [...prev, ...(data || [])]);
        }
        setTotalClients(count || 0);
        setHasMoreClients(hasMore);
      } catch (err) {
        console.error('[useClients] load error:', err);
        setError('No se pudieron cargar los clientes.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId]
  );

  // ─── Cargar más ────────────────────────────────────────────────────────
  const loadMoreClients = useCallback(() => {
    const nextPage = clientsPage + 1;
    setClientsPage(nextPage);
    setLoadingMore(true);
    loadClients(nextPage, searchTerm);
  }, [clientsPage, searchTerm, loadClients]);

  // ─── Búsqueda ──────────────────────────────────────────────────────────
  const searchClients = useCallback(
    (search) => {
      setSearchTerm(search);
      setClientsPage(1);
      setLoading(true);
      loadClients(1, search);
    },
    [loadClients]
  );

  // ─── Reset (tras importación o add) ────────────────────────────────────
  const resetAndReload = useCallback(() => {
    setClientsPage(1);
    setSearchTerm('');
    setLoading(true);
    loadClients(1, '');
  }, [loadClients]);

  // ─── Añadir cliente ────────────────────────────────────────────────────
  const addClient = useCallback(
    async (clientData) => {
      if (!userId) return { success: false, error: 'No se encontró un usuario autenticado' };
      try {
        const { error } = await supabase
          .from('clientes')
          .insert([{ ...clientData, user_id: userId }])
          .select();
        if (error) throw error;
        resetAndReload();
        return { success: true };
      } catch (err) {
        console.error('[useClients] addClient error:', err);
        return { success: false, error: err.message };
      }
    },
    [userId, resetAndReload]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    // State
    clients,
    loading,
    loadingMore,
    error,
    totalClients,
    hasMoreClients,
    searchTerm,
    // Actions
    loadClients,
    loadMoreClients,
    searchClients,
    resetAndReload,
    addClient,
    clearError,
  };
};
