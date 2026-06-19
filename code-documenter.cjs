// folder-documenter-fixed.js
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        VerticalAlign, LevelFormat, PageBreak } = require("docx");  // ← PageBreak ditambahkan
const fs = require("fs");
const path = require("path");

// ============ KONFIGURASI ============
const CONFIG = {
  // Ekstensi file yang akan diproses
  extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.html', '.css', '.json', '.xml', '.sql', '.rb', '.go', '.rs'],
  
  // Folder yang diabaikan
  ignoreFolders: ['node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '__pycache__', 'venv', 'env', 'vendor'],
  
  // File yang diabaikan
  ignoreFiles: ['package-lock.json', 'yarn.lock', '.DS_Store', 'thumbs.db'],
  
  // Warna tema
  colors: {
    primary: "1E3A5F",
    accent: "2E75B6",
    codeBg: "F5F5F5",
    success: "1F6B3B",
    warning: "7B3D00",
    border: "BBCFE8"
  }
};

// ============ PARSER PER FILE ============
class FileParser {
  constructor(filePath, relativePath) {
    this.filePath = filePath;
    this.relativePath = relativePath;
    this.fileName = path.basename(filePath);
    this.fileExt = path.extname(filePath).toLowerCase();
    this.content = fs.readFileSync(filePath, 'utf-8');
    this.lines = this.content.split('\n');
    this.analysis = {
      fileName: this.fileName,
      relativePath: relativePath,
      extension: this.fileExt,
      totalLines: this.lines.length,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functions: [],
      classes: [],
      imports: [],
      todos: [],
      fixmes: []
    };
  }

  analyze() {
    let inMultiLineComment = false;
    
    for (let i = 0; i < this.lines.length; i++) {
      let line = this.lines[i];
      const trimmed = line.trim();
      
      if (trimmed.length === 0) {
        this.analysis.blankLines++;
        continue;
      }
      
      // Deteksi komentar berdasarkan bahasa
      const isComment = this.isCommentLine(trimmed, inMultiLineComment);
      
      if (isComment.isComment) {
        this.analysis.commentLines++;
        inMultiLineComment = isComment.inMultiLine;
        
        // Extract TODO dan FIXME
        if (trimmed.toLowerCase().includes('todo')) {
          this.analysis.todos.push({
            line: i + 1,
            text: trimmed.replace(/\/\/\s*TODO:\s*/i, '').replace(/\/\*\s*TODO:\s*/i, '')
          });
        }
        if (trimmed.toLowerCase().includes('fixme')) {
          this.analysis.fixmes.push({
            line: i + 1,
            text: trimmed.replace(/\/\/\s*FIXME:\s*/i, '').replace(/\/\*\s*FIXME:\s*/i, '')
          });
        }
      } else {
        this.analysis.codeLines++;
        this.detectCodeElements(line, i);
      }
    }
    
    return this.analysis;
  }

  isCommentLine(line, inMultiLine) {
    let result = { isComment: false, inMultiLine: inMultiLine };
    
    if (this.fileExt === '.py') {
      if (line.startsWith('#')) result.isComment = true;
      else if (line.startsWith('"""') || line.startsWith("'''")) {
        result.isComment = true;
        result.inMultiLine = !line.endsWith('"""') && !line.endsWith("'''");
      }
    } 
    else if (['.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', '.rs', '.go'].includes(this.fileExt)) {
      if (line.startsWith('//')) result.isComment = true;
      else if (line.startsWith('/*')) {
        result.isComment = true;
        result.inMultiLine = !line.includes('*/');
      }
      else if (inMultiLine) {
        result.isComment = true;
        result.inMultiLine = !line.includes('*/');
      }
    }
    else if (this.fileExt === '.sql') {
      if (line.startsWith('--')) result.isComment = true;
    }
    else if (this.fileExt === '.html') {
      if (line.includes('<!--')) result.isComment = true;
    }
    else if (this.fileExt === '.css') {
      if (line.startsWith('/*')) result.isComment = true;
    }
    
    return result;
  }

  detectCodeElements(line, lineNum) {
    // Deteksi fungsi - DIAMPS untuk React Components
    const functionPatterns = [
      { pattern: /function\s+(\w+)\s*\(/, type: 'function', lang: 'js' },
      { pattern: /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/, type: 'arrow-function', lang: 'js' },
      { pattern: /export\s+default\s+function\s+(\w+)/, type: 'react-component', lang: 'js' },
      { pattern: /const\s+(\w+)\s*:\s*React\.FC\s*=\s*\(/, type: 'react-component', lang: 'ts' },
      { pattern: /function\s+(\w+)\s*\([^)]*\)\s*{/, type: 'function', lang: 'js' },
      { pattern: /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>/, type: 'arrow', lang: 'js' },
      { pattern: /def\s+(\w+)\s*\(([^)]*)\)/, type: 'function', lang: 'py' },
      { pattern: /(?:public|private|protected)?\s*(?:static)?\s*(\w+)\s+(\w+)\s*\([^)]*\)\s*{/, type: 'method', lang: 'java' },
      { pattern: /fn\s+(\w+)\s*\(/, type: 'function', lang: 'rs' },
      { pattern: /func\s+(\w+)\s*\(/, type: 'function', lang: 'go' }
    ];
    
    for (const p of functionPatterns) {
      const match = line.match(p.pattern);
      if (match) {
        this.analysis.functions.push({
          name: match[1] || match[2],
          line: lineNum + 1,
          type: p.type,
          code: this.extractCodeBlock(lineNum)
        });
        break;
      }
    }
    
    // Deteksi kelas
    const classPatterns = [
      { pattern: /class\s+(\w+)/, lang: 'js' },
      { pattern: /class\s+(\w+)(?:\([^)]*\))?:/, lang: 'py' },
      { pattern: /class\s+(\w+)/, lang: 'java' },
      { pattern: /struct\s+(\w+)/, lang: 'rs' },
      { pattern: /type\s+(\w+)\s+struct/, lang: 'go' }
    ];
    
    for (const p of classPatterns) {
      const match = line.match(p.pattern);
      if (match) {
        this.analysis.classes.push({
          name: match[1],
          line: lineNum + 1,
          code: this.extractCodeBlock(lineNum)
        });
        break;
      }
    }
    
    // Deteksi import/require
    const importPatterns = [
      { pattern: /require\(['"]([^'"]+)['"]\)/, type: 'require' },
      { pattern: /import\s+.*\s+from\s+['"]([^'"]+)['"]/, type: 'import' },
      { pattern: /^import\s+['"]([^'"]+)['"]/, type: 'import' },
      { pattern: /^from\s+(\S+)\s+import/, type: 'from' },
      { pattern: /#include\s+[<"]([^>"]+)[>"]/, type: 'include' }
    ];
    
    for (const p of importPatterns) {
      const match = line.match(p.pattern);
      if (match) {
        this.analysis.imports.push({
          line: lineNum + 1,
          source: match[1],
          type: p.type,
          statement: line.trim()
        });
        break;
      }
    }
  }

  extractCodeBlock(startLine, numLines = 15) {
    const endLine = Math.min(startLine + numLines, this.lines.length);
    return this.lines.slice(startLine, endLine).join('\n');
  }
}

// ============ SCANNER FOLDER ============
class FolderScanner {
  constructor(rootPath) {
    this.rootPath = path.resolve(rootPath);
    this.files = [];
    this.analyses = [];
    this.summary = {
      totalFiles: 0,
      totalLines: 0,
      totalCodeLines: 0,
      totalCommentLines: 0,
      totalBlankLines: 0,
      totalFunctions: 0,
      totalClasses: 0,
      filesByType: {},
      todos: [],
      fixmes: []
    };
  }

  scan() {
    console.log(`🔍 Scanning folder: ${this.rootPath}\n`);
    this.scanDirectory(this.rootPath, '');
    return this.files;
  }

  scanDirectory(dirPath, relativePath) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relPath = relativePath ? path.join(relativePath, item) : item;
        
        // Cek apakah folder diabaikan
        if (fs.statSync(fullPath).isDirectory()) {
          if (!CONFIG.ignoreFolders.includes(item)) {
            this.scanDirectory(fullPath, relPath);
          }
          continue;
        }
        
        // Cek ekstensi file
        const ext = path.extname(item).toLowerCase();
        if (CONFIG.extensions.includes(ext) && !CONFIG.ignoreFiles.includes(item)) {
          this.files.push({
            fullPath: fullPath,
            relativePath: relPath,
            extension: ext
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning ${dirPath}:`, error.message);
    }
  }

  async analyzeAll() {
    console.log(`📊 Analyzing ${this.files.length} files...\n`);
    
    let processed = 0;
    for (const file of this.files) {
      processed++;
      process.stdout.write(`\r   Processing: ${processed}/${this.files.length} - ${file.relativePath}`);
      
      try {
        const parser = new FileParser(file.fullPath, file.relativePath);
        const analysis = parser.analyze();
        this.analyses.push(analysis);
        
        // Update summary
        this.summary.totalFiles++;
        this.summary.totalLines += analysis.totalLines;
        this.summary.totalCodeLines += analysis.codeLines;
        this.summary.totalCommentLines += analysis.commentLines;
        this.summary.totalBlankLines += analysis.blankLines;
        this.summary.totalFunctions += analysis.functions.length;
        this.summary.totalClasses += analysis.classes.length;
        
        // Group by file type
        const ext = analysis.extension || 'other';
        if (!this.summary.filesByType[ext]) {
          this.summary.filesByType[ext] = { count: 0, lines: 0 };
        }
        this.summary.filesByType[ext].count++;
        this.summary.filesByType[ext].lines += analysis.totalLines;
        
        // Collect todos and fixmes
        this.summary.todos.push(...analysis.todos.map(t => ({ ...t, file: analysis.relativePath })));
        this.summary.fixmes.push(...analysis.fixmes.map(f => ({ ...f, file: analysis.relativePath })));
        
      } catch (error) {
        console.error(`\n❌ Error analyzing ${file.relativePath}:`, error.message);
      }
    }
    
    console.log(`\n\n✅ Analysis complete!\n`);
    return this.summary;
  }
}

// ============ GENERATOR DOKUMENTASI ============
class DocGenerator {
  constructor(summary, analyses, folderPath) {
    this.summary = summary;
    this.analyses = analyses;
    this.folderPath = folderPath;
    this.content = [];
  }

  generate() {
    this.addCoverPage();
    this.addExecutiveSummary();
    this.addStatisticsDashboard();
    this.addFileStructure();
    this.addTodosAndFixmes();
    this.addFileDetails();
    this.addAppendix();
    return this.content;
  }

  addCoverPage() {
    this.content.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2880, after: 400 },
        children: [new TextRun({ 
          text: "📚 CODE DOCUMENTATION", 
          bold: true, 
          size: 56, 
          color: CONFIG.colors.primary 
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ 
          text: "Complete Source Code Analysis", 
          size: 32, 
          color: CONFIG.colors.accent 
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ 
          text: this.folderPath, 
          size: 24, 
          italic: true, 
          color: CONFIG.colors.accent 
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: CONFIG.colors.accent } },
        children: []
      }),
      this.addInfoBox(`Generated on: ${new Date().toLocaleString()}`),
      new Paragraph({ children: [new PageBreak()] })  // ← PageBreak sudah di-import
    );
  }

  addExecutiveSummary() {
    this.content.push(
      this.h1("📋 Executive Summary"),
      this.para(`This document provides a comprehensive analysis of ${this.summary.totalFiles} source code files in the project.`),
      
      this.h2("Key Metrics"),
      this.table([
        ["Metric", "Value"],
        ["Total Files", String(this.summary.totalFiles)],
        ["Total Lines of Code", String(this.summary.totalLines)],
        ["Code Lines", String(this.summary.totalCodeLines)],
        ["Comment Lines", String(this.summary.totalCommentLines)],
        ["Blank Lines", String(this.summary.totalBlankLines)],
        ["Documentation Coverage", `${((this.summary.totalCommentLines / this.summary.totalLines) * 100).toFixed(1)}%`],
        ["Total Functions", String(this.summary.totalFunctions)],
        ["Total Classes", String(this.summary.totalClasses)],
        ["TODO Items", String(this.summary.todos.length)],
        ["FIXME Items", String(this.summary.fixmes.length)]
      ]),
      new Paragraph({ children: [new PageBreak()] })  // ← PageBreak
    );
  }

  addStatisticsDashboard() {
    this.content.push(
      this.h1("📊 Statistics Dashboard"),
      
      this.h2("Code Distribution"),
      this.createDistributionChart(),
      
      this.h2("Files by Type"),
      this.createFileTypeTable(),
      
      this.h2("Top Files by Size"),
      this.createTopFilesTable(),
      
      new Paragraph({ children: [new PageBreak()] })  // ← PageBreak
    );
  }

  createDistributionChart() {
    const codePercent = (this.summary.totalCodeLines / this.summary.totalLines) * 100;
    const commentPercent = (this.summary.totalCommentLines / this.summary.totalLines) * 100;
    const blankPercent = (this.summary.totalBlankLines / this.summary.totalLines) * 100;
    
    const barWidth = 40;
    const codeBars = Math.round((codePercent / 100) * barWidth);
    const commentBars = Math.round((commentPercent / 100) * barWidth);
    const blankBars = barWidth - codeBars - commentBars;
    
    return this.codeBlock(`
Code Distribution Visualization:
┌──────────────────────────────────────────┐
│ Code:    ${'█'.repeat(codeBars)}${' '.repeat(barWidth - codeBars)} ${codePercent.toFixed(1)}% │
│ Comment: ${'█'.repeat(commentBars)}${' '.repeat(barWidth - commentBars)} ${commentPercent.toFixed(1)}% │
│ Blank:   ${'█'.repeat(blankBars)}${' '.repeat(barWidth - blankBars)} ${blankPercent.toFixed(1)}% │
└──────────────────────────────────────────┘
    `);
  }

  createFileTypeTable() {
    const rows = [["File Type", "Count", "Total Lines", "Average Lines"]];
    
    for (const [ext, data] of Object.entries(this.summary.filesByType)) {
      const avgLines = Math.round(data.lines / data.count);
      rows.push([ext.toUpperCase(), String(data.count), String(data.lines), String(avgLines)]);
    }
    
    return this.table(rows);
  }

  createTopFilesTable() {
    const sorted = [...this.analyses].sort((a, b) => b.totalLines - a.totalLines).slice(0, 10);
    const rows = [["#", "File", "Lines", "Functions", "Classes"]];
    
    sorted.forEach((file, idx) => {
      rows.push([
        String(idx + 1),
        file.relativePath.length > 50 ? file.relativePath.substring(0, 47) + "..." : file.relativePath,
        String(file.totalLines),
        String(file.functions.length),
        String(file.classes.length)
      ]);
    });
    
    return this.table(rows);
  }

  addFileStructure() {
    this.content.push(
      this.h1("📁 Project File Structure"),
      this.para("Complete directory tree of all analyzed files:"),
      this.codeBlock(this.generateTree()),
      new Paragraph({ children: [new PageBreak()] })  // ← PageBreak
    );
  }

  generateTree() {
    const tree = {};
    
    for (const analysis of this.analyses) {
      const parts = analysis.relativePath.split(path.sep);
      let current = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = null; // file
        } else {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      }
    }
    
    const printTree = (obj, indent = "") => {
      let result = "";
      const entries = Object.entries(obj);
      
      for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        const isLast = i === entries.length - 1;
        const prefix = isLast ? "└── " : "├── ";
        
        result += `${indent}${prefix}${key}\n`;
        
        if (value !== null) {
          const childIndent = indent + (isLast ? "    " : "│   ");
          result += printTree(value, childIndent);
        }
      }
      
      return result;
    };
    
    return this.folderPath + "\n" + printTree(tree);
  }

  addTodosAndFixmes() {
    if (this.summary.todos.length > 0 || this.summary.fixmes.length > 0) {
      this.content.push(this.h1("⚠️ Action Items"));
      
      if (this.summary.todos.length > 0) {
        this.content.push(this.h2("TODO Items"));
        const todoRows = [["File", "Line", "Description"]];
        this.summary.todos.slice(0, 20).forEach(todo => {
          todoRows.push([todo.file, String(todo.line), todo.text.substring(0, 60)]);
        });
        this.content.push(this.table(todoRows));
      }
      
      if (this.summary.fixmes.length > 0) {
        this.content.push(this.h2("FIXME Items"));
        const fixmeRows = [["File", "Line", "Description"]];
        this.summary.fixmes.slice(0, 20).forEach(fixme => {
          fixmeRows.push([fixme.file, String(fixme.line), fixme.text.substring(0, 60)]);
        });
        this.content.push(this.table(fixmeRows));
      }
      
      this.content.push(new Paragraph({ children: [new PageBreak()] }));  // ← PageBreak
    }
  }

  addFileDetails() {
    this.content.push(this.h1("📄 Detailed File Analysis"));
    
    for (let i = 0; i < Math.min(this.analyses.length, 50); i++) {  // Limit 50 files for performance
      const file = this.analyses[i];
      
      this.content.push(
        this.h2(`${i + 1}. ${file.relativePath}`),
        this.infoBox(`Extension: ${file.extension} | Lines: ${file.totalLines} | Code: ${file.codeLines} | Comments: ${file.commentLines}`)
      );
      
      // File summary table
      this.content.push(this.h3("File Statistics"));
      this.content.push(this.table([
        ["Metric", "Value"],
        ["Total Lines", String(file.totalLines)],
        ["Code Lines", String(file.codeLines)],
        ["Comment Lines", String(file.commentLines)],
        ["Blank Lines", String(file.blankLines)],
        ["Functions", String(file.functions.length)],
        ["Classes", String(file.classes.length)],
        ["Imports", String(file.imports.length)]
      ]));
      
      // Imports
      if (file.imports.length > 0) {
        this.content.push(this.h3("Dependencies"));
        const importRows = [["Line", "Type", "Source"]];
        file.imports.slice(0, 10).forEach(imp => {
          importRows.push([String(imp.line), imp.type, imp.source]);
        });
        this.content.push(this.table(importRows));
      }
      
      // Functions
      if (file.functions.length > 0) {
        this.content.push(this.h3(`Functions (${file.functions.length})`));
        for (const fn of file.functions.slice(0, 5)) {
          this.content.push(
            this.h4(`▸ ${fn.name}()`),
            this.para(`Line ${fn.line} | Type: ${fn.type}`),
            this.codeBlock(fn.code.substring(0, 300) + (fn.code.length > 300 ? "\n... (truncated)" : ""))
          );
        }
        if (file.functions.length > 5) {
          this.content.push(this.para(`... and ${file.functions.length - 5} more functions`));
        }
      }
      
      // Classes
      if (file.classes.length > 0) {
        this.content.push(this.h3(`Classes (${file.classes.length})`));
        for (const cls of file.classes.slice(0, 3)) {
          this.content.push(
            this.h4(`▸ ${cls.name}`),
            this.para(`Line ${cls.line}`),
            this.codeBlock(cls.code.substring(0, 300) + (cls.code.length > 300 ? "\n... (truncated)" : ""))
          );
        }
      }
      
      this.content.push(new Paragraph({ children: [new PageBreak()] }));  // ← PageBreak
    }
    
    if (this.analyses.length > 50) {
      this.content.push(this.para(`\n... and ${this.analyses.length - 50} more files not shown in detail.`));
    }
  }

  addAppendix() {
    this.content.push(
      this.h1("📎 Appendix"),
      this.h2("File Processing Log"),
      this.table([
        ["#", "File", "Status", "Lines", "Functions", "Classes"],
        ...this.analyses.slice(0, 100).map((file, idx) => [
          String(idx + 1),
          file.relativePath.length > 40 ? file.relativePath.substring(0, 37) + "..." : file.relativePath,
          "✅ Analyzed",
          String(file.totalLines),
          String(file.functions.length),
          String(file.classes.length)
        ])
      ])
    );
  }

  // ============ HELPER METHODS ============
  h1(text) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text, bold: true, size: 36, color: CONFIG.colors.primary, font: "Arial" })]
    });
  }

  h2(text) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text, bold: true, size: 28, color: CONFIG.colors.accent, font: "Arial" })]
    });
  }

  h3(text) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text, bold: true, size: 24, color: CONFIG.colors.primary, font: "Arial" })]
    });
  }

  h4(text) {
    return new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text, bold: true, size: 22, color: CONFIG.colors.accent, font: "Arial" })]
    });
  }

  para(text) {
    return new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text, size: 22, font: "Arial" })]
    });
  }

  codeBlock(code) {
    return new Paragraph({
      spacing: { after: 120, before: 60 },
      indent: { left: 360, right: 360 },
      shading: { fill: CONFIG.colors.codeBg, type: ShadingType.CLEAR },
      children: [new TextRun({ text: code, font: "Courier New", size: 18, color: "#1A1A1A" })]
    });
  }

  infoBox(text) {
    return new Paragraph({
      spacing: { before: 100, after: 100 },
      indent: { left: 360, right: 360 },
      shading: { fill: "EBF4FB", type: ShadingType.CLEAR },
      border: { left: { style: BorderStyle.SINGLE, size: 8, color: CONFIG.colors.accent, space: 4 } },
      children: [new TextRun({ text, size: 20, font: "Arial", color: CONFIG.colors.primary })]
    });
  }

  addInfoBox(text) {
    return this.infoBox(text);
  }

  table(rows) {
    const colCount = rows[0].length;
    const colWidth = Math.floor(9360 / colCount);
    
    const tableRows = rows.map((row, idx) => {
      const isHeader = idx === 0;
      const cells = row.map(cell => new TableCell({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: CONFIG.colors.border },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: CONFIG.colors.border },
          left: { style: BorderStyle.SINGLE, size: 1, color: CONFIG.colors.border },
          right: { style: BorderStyle.SINGLE, size: 1, color: CONFIG.colors.border }
        },
        shading: isHeader ? { fill: CONFIG.colors.primary, type: ShadingType.CLEAR } : null,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ 
            text: cell, 
            bold: isHeader, 
            color: isHeader ? "#FFFFFF" : "#000000",
            size: 20 
          })]
        })]
      }));
      
      return new TableRow({ children: cells });
    });
    
    return new Table({
      width: { size: 9360, type: WidthType.DXA },
      rows: tableRows
    });
  }
}

// ============ MAIN APPLICATION ============
class FolderCodeDocumenter {
  async run() {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    📚 FOLDER CODE DOCUMENTATION GENERATOR                  ║
║              Complete Source Code Analysis for Entire Project              ║
╚═══════════════════════════════════════════════════════════════════════════╝
    `);
    
    // Get folder path from command line
    let folderPath = process.argv[2];
    
    if (!folderPath) {
      folderPath = process.cwd();
      console.log(`📁 No folder specified, using current directory: ${folderPath}\n`);
    }
    
    if (!fs.existsSync(folderPath)) {
      console.error(`❌ ERROR: Folder not found: ${folderPath}`);
      console.log(`
Usage:
  node folder-documenter-fixed.js <path-to-folder>

Examples:
  node folder-documenter-fixed.js .
  node folder-documenter-fixed.js ./src
  node folder-documenter-fixed.js "C:\\Users\\JORDY\\Documents\\GitHub\\VISIATTEND\\client\\pages"
      `);
      process.exit(1);
    }
    
    // Scan folder
    const scanner = new FolderScanner(folderPath);
    scanner.scan();
    
    if (scanner.files.length === 0) {
      console.log(`⚠️  No supported files found in ${folderPath}`);
      console.log(`Supported extensions: ${CONFIG.extensions.join(', ')}`);
      process.exit(0);
    }
    
    console.log(`📊 Found ${scanner.files.length} files to analyze\n`);
    
    // Analyze all files
    await scanner.analyzeAll();
    
    // Generate documentation
    console.log(`📝 Generating documentation...`);
    const generator = new DocGenerator(scanner.summary, scanner.analyses, folderPath);
    const content = generator.generate();
    
    // Create output directory
    const outputDir = "./documentation_output";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create Word document
    const folderName = path.basename(folderPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const outputPath = path.join(outputDir, `${folderName}_documentation_${timestamp}.docx`);
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 }
          }
        },
        children: content
      }]
    });
    
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    
    // Print summary
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                           ✅ DOCUMENTATION COMPLETE                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 FINAL SUMMARY:
   ├─ Files Analyzed:     ${scanner.summary.totalFiles}
   ├─ Total Lines:        ${scanner.summary.totalLines}
   ├─ Code Lines:         ${scanner.summary.totalCodeLines}
   ├─ Comment Lines:      ${scanner.summary.totalCommentLines}
   ├─ Documentation:      ${((scanner.summary.totalCommentLines / scanner.summary.totalLines) * 100).toFixed(1)}%
   ├─ Functions:          ${scanner.summary.totalFunctions}
   ├─ Classes:            ${scanner.summary.totalClasses}
   └─ Action Items:       ${scanner.summary.todos.length + scanner.summary.fixmes.length}

📄 OUTPUT FILE:
   ${outputPath}

💡 TIPS:
   • Open with Microsoft Word or Google Docs
   • Use Table of Contents for navigation
   • Export to PDF for sharing
   • Search for specific functions or classes

🎉 Done!
    `);
  }
}

// Run the application
const app = new FolderCodeDocumenter();
app.run().catch(console.error);