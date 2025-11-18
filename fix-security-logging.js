import fs from 'fs';

const securityFiles = [
  'src/lib/security/audit.ts',
  'src/lib/security/data-protection.ts', 
  'src/lib/security/mfa.ts',
  'src/lib/security/rbac.ts'
];

function fixSecurityFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already properly fixed
  if (content.includes("import { logger } from '../logger';\n\nexport class")) {
    console.log(`Already properly fixed: ${filePath}`);
    return;
  }
  
  // Add logger import after the last import before the class
  const lines = content.split('\n');
  let classLineIndex = -1;
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('export class')) {
      classLineIndex = i;
    }
    if (lines[i].startsWith('import ') && i > lastImportIndex) {
      lastImportIndex = i;
    }
  }
  
  if (classLineIndex === -1 || lastImportIndex === -1) {
    console.log(`Could not find class or imports in ${filePath}`);
    return;
  }
  
  // Insert logger import before the class
  lines.splice(classLineIndex, 0, "import { logger } from '../logger';");
  
  // Replace console.error calls with proper logger calls
  let newContent = lines.join('\n');
  
  // More sophisticated regex to match console.error calls
  const consoleErrorPattern = /console\.error\('([^']+)',?\s*([^)]*)\)/g;
  
  newContent = newContent.replace(consoleErrorPattern, (match, message, errorVar) => {
    const cleanErrorVar = errorVar ? errorVar.trim() : '';
    
    // Extract context from the function name if possible
    let operation = 'unknown';
    const callingFunction = newContent.substring(0, newContent.indexOf(match)).split('\n').pop();
    if (callingFunction) {
      if (callingFunction.includes('async ')) {
        const funcMatch = callingFunction.match(/async\s+(\w+)/);
        if (funcMatch) operation = funcMatch[1];
      } else if (callingFunction.includes('function ')) {
        const funcMatch = callingFunction.match(/function\s+(\w+)/);
        if (funcMatch) operation = funcMatch[1];
      }
    }
    
    if (cleanErrorVar && cleanErrorVar !== '') {
      return `logger.error('${message}', ${cleanErrorVar}, {\n        module: 'security',\n        operation: '${operation}'\n      })`;
    } else {
      return `logger.error('${message}', error, {\n        module: 'security',\n        operation: '${operation}'\n      })`;
    }
  });
  
  fs.writeFileSync(filePath, newContent);
  console.log(`Fixed: ${filePath}`);
}

securityFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    fixSecurityFile(filePath);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Security files fix complete!');