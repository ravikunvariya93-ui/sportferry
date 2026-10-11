import { escapeRegex, isValidUsername, isValidPassword, PASSWORD_MIN } from '@/lib/validation';

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    expect(escapeRegex('(x)[y]{z}')).toBe('\\(x\\)\\[y\\]\\{z\\}');
  });

  it('leaves plain text untouched', () => {
    expect(escapeRegex('Surat')).toBe('Surat');
  });

  it('handles null/undefined safely', () => {
    expect(escapeRegex(undefined)).toBe('');
    expect(escapeRegex(null)).toBe('');
  });

  it('neutralises a regex-injection attempt', () => {
    const evil = '.*';
    const re = new RegExp(escapeRegex(evil), 'i');
    expect(re.test('anything')).toBe(false);
    expect(re.test('.*')).toBe(true);
  });
});

describe('isValidUsername', () => {
  it('accepts 3-32 chars of letters, numbers, dot, underscore, hyphen', () => {
    expect(isValidUsername('abc')).toBe(true);
    expect(isValidUsername('user.name-1_2')).toBe(true);
  });

  it('rejects too-short, too-long and invalid-char usernames', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('a b')).toBe(false);
    expect(isValidUsername('a'.repeat(33))).toBe(false);
    expect(isValidUsername('bad@name')).toBe(false);
    expect(isValidUsername(undefined)).toBe(false);
  });
});

describe('isValidPassword', () => {
  it(`requires at least ${PASSWORD_MIN} characters`, () => {
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('longenough')).toBe(true);
    expect(isValidPassword(undefined)).toBe(false);
  });
});
