/**
 * useImportCSV — Hook de dominio para importación CSV.
 *
 * OPTIMIZACIÓN CLAVE vs versión anterior:
 * En lugar de fetchExistingClientsSnapshot (descarga TODOS los clientes),
 * usamos fetchDuplicateCheck que solo descarga los que matchean con el CSV.
 * Para un CSV de 500 rows contra una BD de 10.000 clientes:
 *   - Antes: descargaba 10.000 rows completas (~2MB+ de egress)
 *   - Ahora: descarga solo los matches (típicamente <200 rows, <50KB)
 */
import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  parseCsvText,
  buildColumnMapping,
  hasRequiredColumns,
  mapCsvRowToClient,
} from '../utils/csvImportUtils';
import { fetchDuplicateCheck } from '../services/dashboardDataService';

const initialProgress = { status: 'idle', message: '', details: null };

export const useImportCSV = (userId, onImportSuccess) => {
  const [importProgress, setImportProgress]     = useState(initialProgress);
  const [pendingDuplicates, setPendingDuplicates] = useState([]);
  const [pendingValidClients, setPendingValidClients] = useState([]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const resetImport = useCallback(() => {
    setImportProgress(initialProgress);
    setPendingDuplicates([]);
    setPendingValidClients([]);
  }, []);

  // ─── Paso 1: parsear y validar CSV ─────────────────────────────────────
  const processCSVFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!userId) {
        setImportProgress({
          status: 'error',
          message: 'No se encontró un usuario autenticado',
          details: null,
        });
        return;
      }

      setImportProgress({ status: 'processing', message: 'Analizando archivo...', details: null });

      try {
        const text = await file.text();
        const { headers, rows } = parseCsvText(text);

        const columnMapping = buildColumnMapping(headers);
        const { hasNOrden, hasNombreCompleto } = hasRequiredColumns(columnMapping);

        if (!hasNOrden || !hasNombreCompleto) {
          const errorMsg = [
            'No se pudieron encontrar las columnas requeridas en el CSV.',
            '',
            `Columnas detectadas:`,
            ...headers.map((h, i) => `  ${i + 1}. "${h}"`),
            '',
            'Formatos soportados:',
            '  1) Legacy: "Número" + "Cuenta: Nombre de la cuenta"',
            '  2) Nuevo:  "N ORDEN" + "nombre"',
          ].join('\n');
          throw new Error(errorMsg);
        }

        setImportProgress({ status: 'processing', message: 'Verificando duplicados...', details: null });

        // Mapear todas las filas primero
        const mappedRows = rows.map((row) => mapCsvRowToClient(headers, row, columnMapping, userId));

        // Extraer valores para validar duplicados de forma eficiente
        const orderNums  = [...new Set(mappedRows.map((c) => c['N ORDEN']).filter(Boolean))];
        const phones     = [...new Set(mappedRows.map((c) => c['TELEFONO']).filter(Boolean))];
        const names      = [...new Set(mappedRows.map((c) => c['NOMBRE COMPLETO']?.trim()).filter(Boolean))];

        // OPTIMIZACIÓN CRÍTICA: solo descargamos los que coinciden en BD
        const { existingOrders, existingPhones, existingNames } = await fetchDuplicateCheck(
          supabase,
          userId,
          orderNums,
          phones,
          names
        );

        const clientsToInsert   = [];
        const duplicates        = [];
        const duplicatesData    = [];
        const errors            = [];

        // Sets para detectar duplicados dentro del mismo archivo
        const seenOrders = new Set(existingOrders);
        const seenPhones = new Set(existingPhones);
        const seenNames  = new Set(existingNames);

        mappedRows.forEach((client, i) => {
          // Validar campos requeridos
          if (!client['N ORDEN'] || !client['NOMBRE COMPLETO']) {
            errors.push(`Fila ${i + 2}: Falta N° ORDEN o NOMBRE COMPLETO`);
            return;
          }

          const orderNum = client['N ORDEN'];
          const phone    = client['TELEFONO'];
          const name     = client['NOMBRE COMPLETO']?.trim().toLowerCase();

          if (seenOrders.has(orderNum)) {
            duplicates.push(`Fila ${i + 2}: N° ORDEN ${orderNum} ya existe`);
            duplicatesData.push({ client, reason: 'N ORDEN', key: orderNum });
            return;
          }

          if (phone && seenPhones.has(phone)) {
            duplicates.push(`Fila ${i + 2}: TELEFONO ${phone} ya existe`);
            duplicatesData.push({ client, reason: 'TELEFONO', key: phone });
            return;
          }

          if (name && seenNames.has(name)) {
            duplicates.push(`Fila ${i + 2}: Cliente "${client['NOMBRE COMPLETO']}" ya existe`);
            duplicatesData.push({ client, reason: 'NOMBRE COMPLETO', key: client['NOMBRE COMPLETO']?.trim() });
            return;
          }

          // Añadir a los sets in-file para detectar duplicados dentro del CSV
          seenOrders.add(orderNum);
          if (phone) seenPhones.add(phone);
          if (name)  seenNames.add(name);

          clientsToInsert.push(client);
        });

        setPendingValidClients(clientsToInsert);
        setPendingDuplicates(duplicatesData);

        setImportProgress({
          status: 'success',
          message: 'Análisis del CSV completado',
          details: {
            total: rows.length,
            validCount: clientsToInsert.length,
            duplicates: duplicates.length,
            errors: errors.length,
            duplicatesList: duplicates,
            errorsList: errors,
            hasPendingDuplicates: duplicatesData.length > 0,
            hasPendingValid: clientsToInsert.length > 0,
            inserted: 0,
          },
        });
      } catch (err) {
        console.error('[useImportCSV] processCSVFile error:', err);
        setImportProgress({
          status: 'error',
          message: 'Error al procesar el archivo',
          details: { error: err.message },
        });
      }
    },
    [userId]
  );

  // ─── Paso 2a: Insertar solo válidos ────────────────────────────────────
  const insertValidClients = useCallback(async () => {
    if (pendingValidClients.length === 0) return;
    setImportProgress({ status: 'processing', message: 'Insertando clientes...', details: null });

    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert(pendingValidClients)
        .select();
      if (error) throw error;

      const insertedCount = data?.length || 0;
      setPendingValidClients([]);
      setPendingDuplicates([]);
      onImportSuccess?.();

      setImportProgress({
        status: 'success',
        message: 'Importación completada',
        details: {
          total: insertedCount,
          inserted: insertedCount,
          duplicates: 0,
          errors: 0,
          duplicatesList: [],
          errorsList: [],
          hasPendingDuplicates: false,
          hasPendingValid: false,
        },
      });
    } catch (err) {
      console.error('[useImportCSV] insertValidClients error:', err);
      setImportProgress({
        status: 'error',
        message: 'Error al insertar clientes',
        details: { error: err.message },
      });
    }
  }, [pendingValidClients, onImportSuccess]);

  // ─── Paso 2b: Eliminar duplicados e insertar todos ─────────────────────
  const deleteDuplicatesAndInsert = useCallback(async () => {
    if (pendingDuplicates.length === 0) return;
    setImportProgress({
      status: 'processing',
      message: 'Eliminando duplicados e insertando nuevos...',
      details: null,
    });

    try {
      const errors = [];
      let deletedCount = 0;

      const uniqueOrderKeys = [...new Set(
        pendingDuplicates.filter((d) => d.reason === 'N ORDEN').map((d) => d.key).filter(Boolean)
      )];
      const uniquePhoneKeys = [...new Set(
        pendingDuplicates.filter((d) => d.reason === 'TELEFONO').map((d) => d.key).filter(Boolean)
      )];
      const uniqueNameKeys = [...new Set(
        pendingDuplicates.filter((d) => d.reason === 'NOMBRE COMPLETO').map((d) => d.key).filter(Boolean)
      )];

      const deleteOps = [];
      if (uniqueOrderKeys.length > 0) {
        deleteOps.push(
          supabase.from('clientes').delete().eq('user_id', userId).in('"N ORDEN"', uniqueOrderKeys)
            .then(({ error }) => {
              if (error) errors.push(`Error por N ORDEN: ${error.message}`);
              else deletedCount += uniqueOrderKeys.length;
            })
        );
      }
      if (uniquePhoneKeys.length > 0) {
        deleteOps.push(
          supabase.from('clientes').delete().eq('user_id', userId).in('TELEFONO', uniquePhoneKeys)
            .then(({ error }) => {
              if (error) errors.push(`Error por TELEFONO: ${error.message}`);
              else deletedCount += uniquePhoneKeys.length;
            })
        );
      }
      if (uniqueNameKeys.length > 0) {
        deleteOps.push(
          supabase.from('clientes').delete().eq('user_id', userId).in('"NOMBRE COMPLETO"', uniqueNameKeys)
            .then(({ error }) => {
              if (error) errors.push(`Error por NOMBRE: ${error.message}`);
              else deletedCount += uniqueNameKeys.length;
            })
        );
      }

      await Promise.all(deleteOps);

      const allClientsToInsert = [
        ...pendingDuplicates.map((d) => d.client),
        ...pendingValidClients,
      ];

      let insertedCount = 0;
      if (allClientsToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from('clientes')
          .insert(allClientsToInsert)
          .select();
        if (insertError) {
          errors.push(`Error al insertar: ${insertError.message}`);
        } else {
          insertedCount = data?.length || 0;
        }
      }

      setPendingDuplicates([]);
      setPendingValidClients([]);
      onImportSuccess?.();

      setImportProgress({
        status: 'success',
        message: 'Importación completada (con reemplazo de duplicados)',
        details: {
          total: allClientsToInsert.length,
          deleted: deletedCount,
          inserted: insertedCount,
          duplicates: 0,
          errors: errors.length,
          duplicatesList: [],
          errorsList: errors,
          hasPendingDuplicates: false,
          hasPendingValid: false,
        },
      });
    } catch (err) {
      console.error('[useImportCSV] deleteDuplicatesAndInsert error:', err);
      setImportProgress({
        status: 'error',
        message: 'Error al eliminar duplicados',
        details: { error: err.message },
      });
    }
  }, [pendingDuplicates, pendingValidClients, userId, onImportSuccess]);

  // ─── File select helper ─────────────────────────────────────────────────
  const handleFileSelect = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file && (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'))) {
        processCSVFile(file);
      } else {
        setImportProgress({
          status: 'error',
          message: 'Por favor selecciona un archivo CSV válido',
          details: null,
        });
      }
    },
    [processCSVFile]
  );

  return {
    // State
    importProgress,
    pendingValidClients,
    pendingDuplicates,
    // Actions
    processCSVFile,
    handleFileSelect,
    insertValidClients,
    deleteDuplicatesAndInsert,
    resetImport,
  };
};
