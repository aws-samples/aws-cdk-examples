import { parseArgs } from './index';

describe('CLI argument parsing', () => {
  test('defaults to dry-run for all supported languages', () => {
    expect(parseArgs(['/repo'])).toEqual({
      repoRoot: '/repo',
      languages: ['python', 'java', 'go', 'csharp'],
      mode: 'dry-run',
      json: false,
    });
  });

  test('supports repeated and comma-separated language selection', () => {
    expect(parseArgs(['/repo', '--language', 'python,java', '--language', 'go', '--check', '--json']))
      .toEqual({
        repoRoot: '/repo',
        languages: ['python', 'java', 'go'],
        mode: 'check',
        json: true,
      });
  });

  test('rejects conflicting write and check modes', () => {
    expect(() => parseArgs(['/repo', '--write', '--check'])).toThrow('--write and --check cannot be used together');
  });
});
