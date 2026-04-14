export const normalizeHeader = (headerValue = '') => {
  return headerValue
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const detectCsvSeparator = (line = '') => {
  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
};

export const parseCSVLine = (line, separator) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim().replace(/^"|"$/g, ''));
  return values;
};

export const parseCsvText = (text = '') => {
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('El archivo CSV esta vacio o no tiene datos');
  }

  const separator = detectCsvSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], separator);
  const rows = lines.slice(1).map((line) => parseCSVLine(line, separator));

  return { lines, separator, headers, rows };
};

export const buildColumnMapping = (headers = []) => {
  const columnMapping = {};

  headers.forEach((header) => {
    const cleanHeader = normalizeHeader(header);

    if (
      cleanHeader === 'nmero' ||
      cleanHeader === 'numero' ||
      cleanHeader.match(/^n.?mero$/) ||
      cleanHeader === 'n orden' ||
      cleanHeader === 'norden' ||
      cleanHeader === 'wo'
    ) {
      columnMapping[header] = 'N ORDEN';
    } else if (cleanHeader.includes('nombre del producto') || cleanHeader.includes('producto activo')) {
      columnMapping[header] = 'CONTRATO';
    } else if (cleanHeader.includes('tipo de orden') || cleanHeader.includes('orden de trabajo')) {
      columnMapping[header] = 'SERVICIO';
    } else if (cleanHeader.includes('detalle') && cleanHeader.includes('estado')) {
      columnMapping[header] = 'ESTADO';
    } else if (cleanHeader === 'fecha' || cleanHeader.startsWith('fecha')) {
      columnMapping[header] = 'FECHA';
    } else if ((cleanHeader.includes('cuenta') && cleanHeader.includes('nombre')) || cleanHeader === 'nombre') {
      columnMapping[header] = 'NOMBRE COMPLETO';
    } else if (cleanHeader === 'principal' || cleanHeader === 'telefono' || cleanHeader === 'telefono 1') {
      columnMapping[header] = 'TELEFONO';
    } else if (cleanHeader === 'secundario' || cleanHeader.includes('secundar') || cleanHeader === 'telefono 2') {
      columnMapping[header] = 'TELEFONO FIJO';
    } else if (cleanHeader.includes('direcc') || cleanHeader.includes('address') || cleanHeader === 'direccion') {
      columnMapping[header] = 'DIRECCION';
    } else if (cleanHeader === 'zip' || cleanHeader.includes('codigo postal') || cleanHeader === 'cp') {
      columnMapping[header] = 'CODIGO POSTAL';
    } else if (cleanHeader === 'ciudad' || cleanHeader.includes('municipio')) {
      columnMapping[header] = 'MUNICIPIO';
    }
  });

  return columnMapping;
};

export const hasRequiredColumns = (columnMapping) => {
  const mappedColumns = Object.values(columnMapping);
  return {
    hasNOrden: mappedColumns.includes('N ORDEN'),
    hasNombreCompleto: mappedColumns.includes('NOMBRE COMPLETO'),
  };
};

export const sanitizeFieldValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.startsWith('#¿')
  ) {
    return null;
  }

  return trimmed;
};

export const toNumericOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = value.toString().replace(/\D/g, '');
  return numericValue ? parseInt(numericValue, 10) : null;
};

export const mapCsvRowToClient = (headers, row, columnMapping, userId) => {
  const client = { user_id: userId };

  headers.forEach((header, index) => {
    const dbColumn = columnMapping[header];
    if (!dbColumn) {
      return;
    }

    let value = sanitizeFieldValue(row[index]);

    if (dbColumn === 'N ORDEN' || dbColumn === 'TELEFONO' || dbColumn === 'CODIGO POSTAL') {
      value = toNumericOrNull(value);
    }

    client[dbColumn] = value;
  });

  return client;
};