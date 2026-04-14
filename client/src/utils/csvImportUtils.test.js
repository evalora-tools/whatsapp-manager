import {
  normalizeHeader,
  detectCsvSeparator,
  parseCSVLine,
  buildColumnMapping,
  hasRequiredColumns,
  sanitizeFieldValue,
  toNumericOrNull,
  mapCsvRowToClient,
} from './csvImportUtils';

describe('csvImportUtils', () => {
  it('normalizes accented headers and extra spaces', () => {
    expect(normalizeHeader('  Número de órden  ')).toBe('numero de orden');
  });

  it('detects csv separator from first line', () => {
    expect(detectCsvSeparator('a,b,c')).toBe(',');
    expect(detectCsvSeparator('a;b;c')).toBe(';');
  });

  it('parses quoted values with commas', () => {
    const line = '1,"nombre, completo",600000000';
    expect(parseCSVLine(line, ',')).toEqual(['1', 'nombre, completo', '600000000']);
  });

  it('builds mapping for legacy and new format headers', () => {
    const mapping = buildColumnMapping([
      'N ORDEN',
      'nombre',
      'telefono',
      'Telefono 2',
      'direccion',
      'codigo postal',
    ]);

    expect(mapping['N ORDEN']).toBe('N ORDEN');
    expect(mapping.nombre).toBe('NOMBRE COMPLETO');
    expect(mapping.telefono).toBe('TELEFONO');
    expect(mapping['Telefono 2']).toBe('TELEFONO FIJO');
    expect(mapping.direccion).toBe('DIRECCION');
    expect(mapping['codigo postal']).toBe('CODIGO POSTAL');
  });

  it('checks required columns', () => {
    const mapping = { a: 'N ORDEN', b: 'NOMBRE COMPLETO' };
    expect(hasRequiredColumns(mapping)).toEqual({ hasNOrden: true, hasNombreCompleto: true });
  });

  it('sanitizes empty-like values', () => {
    expect(sanitizeFieldValue('   ')).toBeNull();
    expect(sanitizeFieldValue('null')).toBeNull();
    expect(sanitizeFieldValue('undefined')).toBeNull();
    expect(sanitizeFieldValue('#¿bad')).toBeNull();
    expect(sanitizeFieldValue(' valor ')).toBe('valor');
  });

  it('converts numeric strings safely', () => {
    expect(toNumericOrNull('(+34) 600-111-222')).toBe(34600111222);
    expect(toNumericOrNull('')).toBeNull();
  });

  it('maps row to client object with numeric normalization', () => {
    const headers = ['N ORDEN', 'nombre', 'telefono', 'codigo postal'];
    const mapping = {
      'N ORDEN': 'N ORDEN',
      nombre: 'NOMBRE COMPLETO',
      telefono: 'TELEFONO',
      'codigo postal': 'CODIGO POSTAL',
    };

    const client = mapCsvRowToClient(headers, ['20644678', 'RAQUEL', '636307336', '18170'], mapping, 'user-1');

    expect(client.user_id).toBe('user-1');
    expect(client['N ORDEN']).toBe(20644678);
    expect(client['NOMBRE COMPLETO']).toBe('RAQUEL');
    expect(client.TELEFONO).toBe(636307336);
    expect(client['CODIGO POSTAL']).toBe(18170);
  });
});