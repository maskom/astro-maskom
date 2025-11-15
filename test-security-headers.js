/**
 * Security headers test script
 * Run this to verify that security headers are properly implemented
 */

async function testSecurityHeaders() {
  try {
    // Test the main page
    const response = await fetch('http://localhost:4321');
    
    console.log('=== Security Headers Test ===\n');
    console.log('Status:', response.status);
    console.log('URL:', response.url);
    console.log('\n=== Headers ===');
    
    // Check for required security headers
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security'
    ];
    
    const headers: { [key: string]: string } = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
      if (requiredHeaders.includes(key)) {
        console.log(`✅ ${key}: ${value}`);
      }
    });
    
    // Check for missing headers
    console.log('\n=== Missing Headers ===');
    requiredHeaders.forEach(header => {
      if (!headers[header]) {
        console.log(`❌ ${header}: MISSING`);
      }
    });
    
    // Validate CSP
    if (headers['Content-Security-Policy']) {
      console.log('\n=== CSP Analysis ===');
      const csp = headers['Content-Security-Policy'];
      console.log('CSP:', csp);
      
      // Check for nonce
      if (csp.includes("nonce-")) {
        console.log('✅ CSP uses nonce for inline scripts');
      } else {
        console.log('⚠️  CSP does not use nonce');
      }
      
      // Check for unsafe-inline
      if (csp.includes("'unsafe-inline'")) {
        console.log('⚠️  CSP allows unsafe-inline (should be limited)');
      }
      
      // Check for default-src
      if (csp.includes("default-src 'self'")) {
        console.log('✅ CSP has proper default-src');
      }
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error testing security headers:', error);
    console.log('Make sure the development server is running on http://localhost:4321');
  }
}

// Run the test
testSecurityHeaders();