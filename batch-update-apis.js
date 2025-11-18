import fs from 'fs';

const apiFiles = [
  'src/pages/api/kb/articles.ts',
  'src/pages/api/kb/categories.ts',
  'src/pages/api/kb/search.ts',
  'src/pages/api/kb/stats.ts',
  'src/pages/api/kb/articles/[slug].ts',
  'src/pages/api/kb/articles/[slug]/rate.ts',
  'src/pages/api/security/dashboard.ts',
  'src/pages/api/security/export-data.ts'
];

function updateApiFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if logger already imported
  if (content.includes('generateRequestId')) {
    console.log(`Already updated: ${filePath}`);
    return;
  }
  
  // Add logger import after the last import
  const importRegex = /import[^;]+;/g;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    console.log(`No imports found in ${filePath}`);
    return;
  }
  
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;
  
  const loggerImport = `\nimport { logger, generateRequestId } from '../../../lib/logger';`;
  
  let newContent = content.slice(0, insertPosition) + loggerImport + content.slice(insertPosition);
  
  // Add requestId to each export function
  const exportPattern = /export const (GET|POST|PUT|DELETE): APIRoute = async \(([^)]+)\) => \{\s*try \{/g;
  
  newContent = newContent.replace(exportPattern, (match, method, params) => {
    return `export const ${method}: APIRoute = async (${params}) => {\n  const requestId = generateRequestId();\n  \n  try {`;
  });
  
  // Replace console.error calls
  const consoleErrorPattern = /console\.error\('([^']+)',?\s*([^)]*)\)/g;
  
  newContent = newContent.replace(consoleErrorPattern, (match, message, errorVar) => {
    const cleanErrorVar = errorVar ? errorVar.trim() : '';
    const endpoint = filePath.replace('src/pages/api', '/api').replace('.ts', '');
    
    if (cleanErrorVar && cleanErrorVar !== '') {
      return `logger.apiError('${message}', ${cleanErrorVar}, {\n      requestId,\n      endpoint: '${endpoint}',\n      method: 'UNKNOWN'\n    })`;
    } else {
      return `logger.apiError('${message}', error, {\n      requestId,\n      endpoint: '${endpoint}',\n      method: 'UNKNOWN'\n    })`;
    }
  });
  
  fs.writeFileSync(filePath, newContent);
  console.log(`Updated: ${filePath}`);
}

apiFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    updateApiFile(filePath);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('API files update complete!');