import fs from 'fs';
import path from 'path';

const IMPORT_REGEX = /^import[\s\S]+?from\s+['"][^'"]+['"];?/gm;
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

type ImportType = 'package' | 'relative' | 'unknown';

function classifyImport(statement: string): ImportType {
  const match = statement.match(/from\s+['"]([^'"]+)['"]/);
  if (!match) return 'unknown';
  const source = match[1];

  if (source.startsWith('.')) return 'relative';
  return 'package';
}

function organizeImports(fileContent: string): string {
  const lines = fileContent.trimStart().split('\n');
  let useClientLine = '';

  // Preserve `"use client"` directive
  if (/^['"]use client['"];$/.test(lines[0])) {
    useClientLine = lines[0];
    lines.shift(); // Remove it from further processing
    fileContent = lines.join('\n').trimStart();
  }

  const importStatements = fileContent.match(IMPORT_REGEX) || [];
  const otherContent = fileContent.replace(IMPORT_REGEX, '').trimStart();

  const grouped: Record<ImportType, string[]> = {
    package: [],
    relative: [],
    unknown: [],
  };

  for (const imp of importStatements) {
    const type = classifyImport(imp);
    grouped[type].push(imp);
  }

  const sortByLengthDesc = (arr: string[]): string[] =>
    arr.sort((a, b) => b.length - a.length);

  const sortedImports = [
    ...sortByLengthDesc(grouped.package),
    '',
    ...sortByLengthDesc(grouped.relative),
  ];

  let result = '';
  if (useClientLine) result += `${useClientLine}\n\n`;
  result += sortedImports.join('\n') + '\n\n' + otherContent;

  return result;
}

export async function organizeImportsInFile(filePath?: string):Promise<void> {
  try {
    const FILE_PATH = filePath ?? process.argv[3];

    if (!FILE_PATH) {
      throw new Error("❌ Please specify a .js/.jsx/.ts/.tsx file path.");
    }

    const fullPath = path.resolve(FILE_PATH);
    const ext = path.extname(fullPath);
    
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new Error(`❌ Unsupported file extension: ${ext}. Supported extensions are: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`❌ File not found: ${FILE_PATH}`);
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const updatedContent = organizeImports(fileContent);
    fs.writeFileSync(fullPath, updatedContent, 'utf-8');
    console.log(`✅ Imports organized in: ${FILE_PATH}`);
  } catch (error) {
    console.error(`❌ Error organizing imports in file:`, error);
    throw error;
  }
}

async function processDirectory(directoryPath: string): Promise<void> {
  try {
    const fullPath = path.resolve(directoryPath);
    const files = fs.readdirSync(fullPath);

    for (const file of files) {
      const filePath = path.join(fullPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        await processDirectory(filePath);
      } else if (stat.isFile() && SUPPORTED_EXTENSIONS.includes(path.extname(file))) {
        await organizeImportsInFile(filePath);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${directoryPath}:`, error);
    throw error;
  }
}

export async function organizeImportsInDirectory(): Promise<void> {
  const DIRECTORY = process.argv[3];

  if (!DIRECTORY) {
    throw new Error("❌ Please specify a directory path.");
  }

  const fullPath = path.resolve(DIRECTORY);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`❌ Directory not found: ${DIRECTORY}`);
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isDirectory()) {
    throw new Error(`❌ Path is not a directory: ${DIRECTORY}`);
  }

  try {
    await processDirectory(DIRECTORY);
    console.log(`✅ Finished organizing imports in directory: ${DIRECTORY}`);
  } catch (error) {
    console.error(`❌ Error processing directory ${DIRECTORY}:`, error);
    throw error;
  }
} 