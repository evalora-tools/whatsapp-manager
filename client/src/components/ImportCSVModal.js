import React, { useRef, useState } from 'react';

const ImportCSVModal = ({ onClose, onFileSelect, progress, onInsertValid, onDeleteDuplicates, pendingValidCount, pendingDuplicatesCount }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        onFileSelect({ target: { files: [file] } });
      } else {
        alert('Por favor selecciona un archivo CSV válido');
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-5 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Importar Clientes desde CSV</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {progress.status === 'idle' && (
            <>
              {/* Instrucciones */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Formato del archivo CSV
                </h3>
                <p className="text-sm text-blue-800 mb-2">Se aceptan dos formatos de CSV. Debe incluir al menos N ORDEN y NOMBRE del cliente:</p>
                <ul className="text-sm text-blue-700 space-y-1 ml-4">
                  <li>• <strong>Formato 1 (legacy):</strong> Número, Cuenta: Nombre de la cuenta, Principal, Secundaria, Dirección completa, Zip, Ciudad</li>
                  <li>• <strong>Formato 2 (nuevo):</strong> N ORDEN, Tipo de orden de trabajo, nombre, telefono, Telefono 2, direccion, codigo postal</li>
                  <li>• Campos opcionales se insertan como null cuando no estén presentes.</li>
                </ul>
              </div>

              {/* Drag & Drop Area */}
              <div
                className={`border-3 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={onFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700 mb-1">
                      Arrastra tu archivo CSV aquí
                    </p>
                    <p className="text-sm text-gray-500">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Seleccionar archivo
                  </button>
                </div>
              </div>
            </>
          )}

          {progress.status === 'processing' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">{progress.message}</p>
              <p className="text-sm text-gray-500 mt-2">Por favor espera...</p>
            </div>
          )}

          {progress.status === 'success' && progress.details && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{progress.message}</h3>
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{progress.details.total}</p>
                  <p className="text-sm text-blue-800">Total registros</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{progress.details.validCount || progress.details.inserted}</p>
                  <p className="text-sm text-green-800">{progress.details.hasPendingValid ? 'Válidos' : 'Importados'}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{progress.details.duplicates}</p>
                  <p className="text-sm text-yellow-800">Duplicados</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{progress.details.errors}</p>
                  <p className="text-sm text-red-800">Errores</p>
                </div>
              </div>

              {/* Detalles de duplicados */}
              {progress.details.duplicatesList && progress.details.duplicatesList.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <h4 className="font-semibold text-yellow-900 mb-2">Registros duplicados detectados:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {progress.details.duplicatesList.slice(0, 10).map((dup, idx) => (
                      <li key={idx}>• {dup}</li>
                    ))}
                    {progress.details.duplicatesList.length > 10 && (
                      <li className="font-semibold">... y {progress.details.duplicatesList.length - 10} más</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Detalles de errores */}
              {progress.details.errorsList && progress.details.errorsList.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <h4 className="font-semibold text-red-900 mb-2">Errores encontrados:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {progress.details.errorsList.slice(0, 10).map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                    {progress.details.errorsList.length > 10 && (
                      <li className="font-semibold">... y {progress.details.errorsList.length - 10} más</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Botones de acción cuando hay pendientes */}
              {(progress.details.hasPendingValid || progress.details.hasPendingDuplicates) && (
                <div className="space-y-3 pt-2">
                  {/* Botón para insertar solo los válidos (no duplicados) */}
                  {pendingValidCount > 0 && progress.details.hasPendingValid && (
                    <button
                      onClick={onInsertValid}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Importar solo válidos ({pendingValidCount})</span>
                    </button>
                  )}

                  {/* Botón para eliminar duplicados e insertar todo */}
                  {pendingDuplicatesCount > 0 && progress.details.hasPendingDuplicates && (
                    <button
                      onClick={onDeleteDuplicates}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Reemplazar duplicados e importar todo ({pendingValidCount + pendingDuplicatesCount})</span>
                    </button>
                  )}

                  {/* Botón cancelar */}
                  <button
                    onClick={onClose}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-all duration-200"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Botón cerrar cuando ya se completó la importación */}
              {!progress.details.hasPendingValid && !progress.details.hasPendingDuplicates && (
                <button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Cerrar
                </button>
              )}
            </div>
          )}

          {progress.status === 'error' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{progress.message}</h3>
              {progress.details?.error && (
                <p className="text-sm text-red-600 mb-6">{progress.details.error}</p>
              )}
              <button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportCSVModal;
