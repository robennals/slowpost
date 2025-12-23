import { describe, it, expect } from 'vitest';
import {
  defaultNameFromEmail,
  parseEmailLine,
  parseEmailText,
} from '../../src/shared/emailParser';

describe('Email Parser', () => {
  describe('defaultNameFromEmail', () => {
    it('converts simple email to capitalized name', () => {
      expect(defaultNameFromEmail('john@example.com')).toBe('John');
    });

    it('converts dot-separated email to full name', () => {
      expect(defaultNameFromEmail('john.doe@example.com')).toBe('John Doe');
    });

    it('converts underscore-separated email to full name', () => {
      expect(defaultNameFromEmail('john_doe@example.com')).toBe('John Doe');
    });

    it('converts hyphen-separated email to full name', () => {
      expect(defaultNameFromEmail('john-doe@example.com')).toBe('John Doe');
    });

    it('handles mixed separators', () => {
      expect(defaultNameFromEmail('first.middle_last@example.com')).toBe('First Middle Last');
    });

    it('handles all caps', () => {
      expect(defaultNameFromEmail('JOHN.DOE@example.com')).toBe('John Doe');
    });
  });

  describe('parseEmailLine', () => {
    it('parses simple email format', () => {
      const result = parseEmailLine('test@example.com');
      expect(result).toEqual({ email: 'test@example.com' });
    });

    it('parses name with angle brackets format', () => {
      const result = parseEmailLine('John Doe <test@example.com>');
      expect(result).toEqual({ email: 'test@example.com', name: 'John Doe' });
    });

    it('parses quoted name with angle brackets format', () => {
      const result = parseEmailLine('"John Doe" <test@example.com>');
      expect(result).toEqual({ email: 'test@example.com', name: 'John Doe' });
    });

    it('parses single-quoted name with angle brackets format', () => {
      const result = parseEmailLine("'John Doe' <test@example.com>");
      expect(result).toEqual({ email: 'test@example.com', name: 'John Doe' });
    });

    it('returns error for empty line', () => {
      const result = parseEmailLine('   ');
      expect(result).toBe('Empty line');
    });

    it('returns error for invalid email', () => {
      const result = parseEmailLine('not-an-email');
      expect(result).toContain('Invalid format');
    });

    it('returns error for invalid email in angle brackets', () => {
      const result = parseEmailLine('John Doe <not-an-email>');
      expect(result).toContain('Invalid email address');
    });

    it('handles extra whitespace', () => {
      const result = parseEmailLine('  John Doe  <  test@example.com  >  ');
      expect(result).toEqual({ email: 'test@example.com', name: 'John Doe' });
    });
  });

  describe('parseEmailText', () => {
    it('parses multiple emails', () => {
      const text = `
john@example.com
Jane Doe <jane@example.com>
"Bob Smith" <bob@example.com>
      `.trim();

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      expect(result.emails[0]).toEqual({
        email: 'john@example.com',
        name: 'John',
      });

      expect(result.emails[1]).toEqual({
        email: 'jane@example.com',
        name: 'Jane Doe',
      });

      expect(result.emails[2]).toEqual({
        email: 'bob@example.com',
        name: 'Bob Smith',
      });
    });

    it('skips empty lines', () => {
      const text = `
john@example.com

jane@example.com


bob@example.com
      `.trim();

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('collects errors for invalid lines', () => {
      const text = `
john@example.com
invalid-email
Jane Doe <jane@example.com>
another-invalid
      `.trim();

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(2);
      expect(result.errors).toHaveLength(2);

      expect(result.errors[0]).toMatchObject({
        line: 2,
        text: 'invalid-email',
      });

      expect(result.errors[1]).toMatchObject({
        line: 4,
        text: 'another-invalid',
      });
    });

    it('generates default names for emails without names', () => {
      const text = 'first.last@example.com';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(1);
      expect(result.emails[0]).toEqual({
        email: 'first.last@example.com',
        name: 'First Last',
      });
    });

    it('handles Windows line endings', () => {
      const text = 'john@example.com\r\njane@example.com\r\nbob@example.com';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('parses comma-separated emails', () => {
      const text = 'john@example.com, jane@example.com, bob@example.com';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0].email).toBe('john@example.com');
      expect(result.emails[1].email).toBe('jane@example.com');
      expect(result.emails[2].email).toBe('bob@example.com');
    });

    it('parses semicolon-separated emails', () => {
      const text = 'john@example.com; jane@example.com; bob@example.com';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0].email).toBe('john@example.com');
      expect(result.emails[1].email).toBe('jane@example.com');
      expect(result.emails[2].email).toBe('bob@example.com');
    });

    it('parses mixed separators (newline, comma, semicolon)', () => {
      const text = `john@example.com, jane@example.com
bob@example.com; charlie@example.com`;

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(4);
      expect(result.errors).toHaveLength(0);
    });

    it('handles commas inside quotes correctly', () => {
      const text = '"Doe, John" <john@example.com>, "Smith, Jane" <jane@example.com>';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0]).toEqual({
        email: 'john@example.com',
        name: 'Doe, John',
      });
      expect(result.emails[1]).toEqual({
        email: 'jane@example.com',
        name: 'Smith, Jane',
      });
    });

    it('handles semicolons inside quotes correctly', () => {
      const text = '"Project; Team" <team@example.com>; "Admin; Lead" <admin@example.com>';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0]).toEqual({
        email: 'team@example.com',
        name: 'Project; Team',
      });
      expect(result.emails[1]).toEqual({
        email: 'admin@example.com',
        name: 'Admin; Lead',
      });
    });

    it('handles real email CC format from Gmail', () => {
      const text = 'John Doe <john@example.com>, jane@example.com, "Smith, Bob" <bob@example.com>';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0]).toEqual({
        email: 'john@example.com',
        name: 'John Doe',
      });
      expect(result.emails[1]).toEqual({
        email: 'jane@example.com',
        name: 'Jane',
      });
      expect(result.emails[2]).toEqual({
        email: 'bob@example.com',
        name: 'Smith, Bob',
      });
    });

    it('handles real email CC format from Outlook (semicolons)', () => {
      const text = 'John Doe <john@example.com>; jane@example.com; "Smith, Bob" <bob@example.com>';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0]).toEqual({
        email: 'john@example.com',
        name: 'John Doe',
      });
      expect(result.emails[1]).toEqual({
        email: 'jane@example.com',
        name: 'Jane',
      });
      expect(result.emails[2]).toEqual({
        email: 'bob@example.com',
        name: 'Smith, Bob',
      });
    });

    it('handles mixed separators with quoted names containing commas', () => {
      const text = `"Last, First" <user1@example.com>
user2@example.com, "Company, Inc." <user3@example.com>; user4@example.com`;

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(4);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0].name).toBe('Last, First');
      expect(result.emails[1].name).toBe('User2');
      expect(result.emails[2].name).toBe('Company, Inc.');
      expect(result.emails[3].name).toBe('User4');
    });

    it('ignores trailing commas and semicolons', () => {
      const text = 'john@example.com, jane@example.com,';

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('handles single quotes for names with commas', () => {
      const text = "'Doe, John' <john@example.com>, 'Smith, Jane' <jane@example.com>";

      const result = parseEmailText(text);

      expect(result.emails).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.emails[0]).toEqual({
        email: 'john@example.com',
        name: 'Doe, John',
      });
      expect(result.emails[1]).toEqual({
        email: 'jane@example.com',
        name: 'Smith, Jane',
      });
    });
  });
});
