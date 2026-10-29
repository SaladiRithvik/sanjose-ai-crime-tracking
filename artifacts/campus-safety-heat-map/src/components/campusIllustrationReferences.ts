// Percentages locate labels within the supplied PDF illustration, not geographic coordinates.
export const PDF_REFERENCES = [
  { code: 'KING', name: 'Dr. Martin Luther King, Jr. Library', query: 'Martin Luther King Jr. Library, San Jose, California', x: 13.2, y: 32.1 },
  { code: 'ENG', name: 'Engineering', query: 'Engineering, San Jose, California', x: 64, y: 35.9 },
  { code: 'SU', name: 'Diaz Compean Student Union', query: 'Student Union, San Jose, California', x: 65.4, y: 48.8 },
  { code: 'BBC', name: 'Boccardo Business Center', query: 'Boccardo Business Center, San Jose', x: 87.7, y: 58.1 },
  { code: 'SPXC', name: 'Spartan Complex - Center', query: 'Spartan Complex, San Jose, California', x: 29.1, y: 67.4 },
  { code: 'CV2', name: 'Campus Village 2', query: 'Campus Village, San Jose, California', x: 75.4, y: 84.1 },
] as const;

export type PdfReference = (typeof PDF_REFERENCES)[number];