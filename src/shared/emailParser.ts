/**
 * Email parsing utilities for handling various email formats:
 * - Simple: email@example.com
 * - With name: John Doe <email@example.com>
 * - With quoted name: "John Doe" <email@example.com>
 */

export interface ParsedEmail {
  email: string;
  name?: string;
}

export interface ParseError {
  line: number;
  text: string;
  error: string;
}

export interface ParseResult {
  emails: ParsedEmail[];
  errors: ParseError[];
}

/**
 * Generate a default name from an email address.
 * Converts "first.last@domain.com" to "First Last"
 */
export function defaultNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];

  // Split on common separators: . _ -
  const parts = localPart.split(/[._-]/);

  // Capitalize each part
  const capitalized = parts.map(part => {
    if (!part) return '';
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });

  return capitalized.filter(Boolean).join(' ');
}

/**
 * Parse a single email line in various formats:
 * - email@example.com
 * - Name <email@example.com>
 * - "Name" <email@example.com>
 */
export function parseEmailLine(line: string): ParsedEmail | string {
  const trimmed = line.trim();

  if (!trimmed) {
    return 'Empty line';
  }

  // Check for name + email format: Name <email> or "Name" <email>
  const nameEmailMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (nameEmailMatch) {
    let name = nameEmailMatch[1].trim();
    const email = nameEmailMatch[2].trim();

    // Remove quotes if present
    if ((name.startsWith('"') && name.endsWith('"')) ||
        (name.startsWith("'") && name.endsWith("'"))) {
      name = name.slice(1, -1).trim();
    }

    if (!isValidEmail(email)) {
      return `Invalid email address: ${email}`;
    }

    return { email, name: name || undefined };
  }

  // Check for simple email format
  if (isValidEmail(trimmed)) {
    return { email: trimmed };
  }

  return `Invalid format. Expected: email@example.com or Name <email@example.com>`;
}

/**
 * Split text by separators (newline, comma, semicolon) while respecting quoted strings.
 * Commas and semicolons inside quotes are not treated as separators.
 */
function splitEmailEntries(text: string): string[] {
  const entries: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    // Handle quote characters
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      current += char;
    }
    // Handle separators (only when not in quotes)
    else if (!inQuotes && (char === ',' || char === ';')) {
      if (current.trim()) {
        entries.push(current.trim());
      }
      current = '';
    }
    // Handle newlines (only when not in quotes)
    else if (!inQuotes && (char === '\n' || char === '\r')) {
      // Skip \r in \r\n sequences
      if (char === '\r' && nextChar === '\n') {
        continue;
      }
      if (current.trim()) {
        entries.push(current.trim());
      }
      current = '';
    }
    // Regular character
    else {
      current += char;
    }
  }

  // Don't forget the last entry
  if (current.trim()) {
    entries.push(current.trim());
  }

  return entries;
}

/**
 * Parse multiple email entries from text input.
 * Supports newline, comma, and semicolon separators.
 * Respects quoted strings (commas/semicolons inside quotes are not separators).
 */
export function parseEmailText(text: string): ParseResult {
  const entries = splitEmailEntries(text);
  const emails: ParsedEmail[] = [];
  const errors: ParseError[] = [];

  entries.forEach((entry, index) => {
    const result = parseEmailLine(entry);

    if (typeof result === 'string') {
      errors.push({
        line: index + 1,
        text: entry,
        error: result,
      });
    } else {
      // Add default name if no name provided
      if (!result.name) {
        result.name = defaultNameFromEmail(result.email);
      }
      emails.push(result);
    }
  });

  return { emails, errors };
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
