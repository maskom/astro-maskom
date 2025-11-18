import fs from 'fs';
import path from 'path';

// Files that need logger import added
const filesNeedingImport = [
  'src/lib/security/session.ts',
  'src/lib/security/rbac.ts',
  'src/lib/security/audit.ts',
  'src/lib/security/data-protection.ts',
  'src/lib/security/mfa.ts',
  'src/lib/payments/service.ts',
  'src/lib/payments/manager.ts',
  'src/lib/payments/gateway.ts',
  'src/lib/supabase.ts'
];

// Function to add logger import if not present
function addLoggerImport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if logger is already imported
  if (content.includes("import { logger } from '../logger'") || 
      content.includes("import { logger } from '@/lib/logger'")) {
    console.log(`Logger already imported in ${filePath}`);
    return;
  }
  
  // Find the last import statement
  const importRegex = /import[^;]+;/g;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    console.log(`No imports found in ${filePath}`);
    return;
  }
  
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;
  
  // Determine the correct import path
  let importPath = "'../logger'";
  if (filePath.includes('src/lib/security/')) {
    importPath = "'../logger'";
  } else if (filePath.includes('src/lib/payments/')) {
    importPath = "'../logger'";
  } else if (filePath.includes('src/lib/')) {
    importPath = "'./logger'";
  }
  
  const loggerImport = `\nimport { logger } from ${importPath};`;
  
  const newContent = content.slice(0, insertPosition) + loggerImport + content.slice(insertPosition);
  
  fs.writeFileSync(filePath, newContent);
  console.log(`Added logger import to ${filePath}`);
}

// Function to replace console.error with logger.error
function replaceConsoleError(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Pattern to match console.error calls
  const consoleErrorPattern = /console\.error\('([^']+)',?\s*([^)]*)\)/g;
  
  let newContent = content.replace(consoleErrorPattern, (match, message, errorVar) => {
    // Clean up the error variable
    const cleanErrorVar = errorVar ? errorVar.trim() : '';
    
    // Generate appropriate context based on the message
    const context = generateContext(message, filePath);
    
    if (cleanErrorVar && cleanErrorVar !== '') {
      return `logger.error('${message}', ${cleanErrorVar}, ${context})`;
    } else {
      return `logger.error('${message}', undefined, ${context})`;
    }
  });
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Replaced console.error in ${filePath}`);
  }
}

// Generate context based on error message and file
function generateContext(message, filePath) {
  const fileName = path.basename(filePath, '.ts');
  const module = fileName.replace('-', '_');
  
  // Try to extract operation from message
  let operation = 'unknown';
  if (message.includes('create')) operation = 'create';
  else if (message.includes('update')) operation = 'update';
  else if (message.includes('delete')) operation = 'delete';
  else if (message.includes('get')) operation = 'get';
  else if (message.includes('validate')) operation = 'validate';
  else if (message.includes('invalidate')) operation = 'invalidate';
  
  return `{
    module: '${module}',
    operation: '${operation}'
  }`;
}

// Process all files
filesNeedingImport.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    addLoggerImport(filePath);
    replaceConsoleError(filePath);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('Batch update complete!');