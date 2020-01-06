const { normalizeUrl } = require('../sourceParser');

describe('sourceParser: normalizeUrl function', () => {
  const wordPressUrl = 'http://wp38.localhost/';
  const uploadsUrl = 'http://wp38.localhost/wp-content/uploads/';

  const expectedUrl =
    'http://wp38.localhost/wp-content/uploads/2020/01/dancer.gif';
  const expectedUrlHttps =
    'https://wp38.localhost/wp-content/uploads/2020/01/dancer.gif';

  it('should handle normal url', () => {
    const result = normalizeUrl(
      'http://wp38.localhost/wp-content/uploads/2020/01/dancer.gif',
      {
        wordPressUrl,
        uploadsUrl,
      }
    );
    expect(result).toBe(expectedUrl);
  });
  it('should accept http(s) url', () => {
    const result = normalizeUrl(
      'https://wp38.localhost/wp-content/uploads/2020/01/dancer.gif',
      {
        wordPressUrl,
        uploadsUrl,
      }
    );
    expect(result).toBe(expectedUrlHttps);
  });
  it('should handle relative url', () => {
    const result = normalizeUrl('/wp-content/uploads/2020/01/dancer.gif', {
      wordPressUrl,
      uploadsUrl,
    });
    expect(result).toBe(expectedUrl);
  });
  it('should handle no protocol url', () => {
    const result = normalizeUrl(
      '//wp38.localhost/wp-content/uploads/2020/01/dancer.gif',
      { wordPressUrl, uploadsUrl }
    );
    expect(result).toBe(expectedUrl);
  });
  it('should reject external url', () => {
    const result = normalizeUrl(
      'http://wp39.localhost/wp-content/uploads/2020/01/dancer.gif',
      { wordPressUrl, uploadsUrl }
    );
    expect(result).toBe(false);
  });
});
