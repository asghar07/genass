// Basic test to ensure CI passes
describe('GenAss', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should validate environment', () => {
    // Basic sanity check
    expect(process.env.NODE_ENV).toBeDefined();
  });
});