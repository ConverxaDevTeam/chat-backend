#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script para detectar dependencias circulares en módulos NestJS
 * Uso: node scripts/check-circular-dependencies.js
 */

class CircularDependencyChecker {
  constructor() {
    this.dependencies = new Map();
    this.visiting = new Set();
    this.visited = new Set();
    this.circularDeps = [];
  }

  /**
   * Busca todos los archivos .module.ts en el proyecto
   */
  findModuleFiles(dir = 'src/modules') {
    const moduleFiles = [];

    if (!fs.existsSync(dir)) {
      console.log(`Directory ${dir} does not exist`);
      return moduleFiles;
    }

    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        moduleFiles.push(...this.findModuleFiles(fullPath));
      } else if (file.name.endsWith('.module.ts')) {
        moduleFiles.push(fullPath);
      }
    }

    return moduleFiles;
  }

  /**
   * Extrae las dependencias de un archivo de módulo
   */
  extractDependencies(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const moduleName = path.basename(filePath, '.module.ts');

      // Buscar imports de otros módulos
      const importRegex = /import\s*{[^}]*}\s*from\s*['"`]([^'"`]*\.module)['"`]/g;
      const deps = [];
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        // Convertir rutas relativas a nombres de módulos
        if (importPath.includes('/')) {
          const parts = importPath.split('/');
          const moduleFileName = parts[parts.length - 1];
          deps.push(moduleFileName.replace('.module', ''));
        }
      }

      // Buscar referencias forwardRef
      const forwardRefRegex = /forwardRef\(\s*\(\)\s*=>\s*(\w+Module)\s*\)/g;
      while ((match = forwardRefRegex.exec(content)) !== null) {
        const moduleName = match[1].replace('Module', '');
        deps.push(moduleName);
      }

      return deps;
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
      return [];
    }
  }

  /**
   * Construye el grafo de dependencias
   */
  buildDependencyGraph() {
    const moduleFiles = this.findModuleFiles();

    for (const filePath of moduleFiles) {
      const moduleName = path.basename(filePath, '.module.ts');
      const deps = this.extractDependencies(filePath);
      this.dependencies.set(moduleName, deps);
    }
  }

  /**
   * Detecta ciclos usando DFS
   */
  detectCycles(node, path = []) {
    if (this.visiting.has(node)) {
      // Encontramos un ciclo
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat([node]);
      this.circularDeps.push(cycle);
      return true;
    }

    if (this.visited.has(node)) {
      return false;
    }

    this.visiting.add(node);
    const newPath = [...path, node];

    const deps = this.dependencies.get(node) || [];
    for (const dep of deps) {
      if (this.dependencies.has(dep)) {
        this.detectCycles(dep, newPath);
      }
    }

    this.visiting.delete(node);
    this.visited.add(node);
    return false;
  }

  /**
   * Ejecuta la verificación completa
   */
  check() {
    console.log('🔍 Checking for circular dependencies...\n');

    this.buildDependencyGraph();

    console.log(`📊 Found ${this.dependencies.size} modules:`);
    for (const [module, deps] of this.dependencies) {
      console.log(`  - ${module}: [${deps.join(', ')}]`);
    }
    console.log();

    // Verificar ciclos para cada nodo no visitado
    for (const module of this.dependencies.keys()) {
      if (!this.visited.has(module)) {
        this.detectCycles(module);
      }
    }

    // Reportar resultados
    if (this.circularDeps.length === 0) {
      console.log('✅ No circular dependencies found!');
      console.log('🎉 Architecture is clean and maintainable.');
      return true;
    } else {
      console.log('❌ Circular dependencies detected:');
      console.log();

      this.circularDeps.forEach((cycle, index) => {
        console.log(`🔄 Cycle ${index + 1}: ${cycle.join(' → ')}`);
      });

      console.log();
      console.log('🛠️  Suggested fixes:');
      console.log('  1. Move shared services to CoreModule');
      console.log('  2. Use event-driven architecture for loose coupling');
      console.log('  3. Create interface modules for shared contracts');
      console.log('  4. Consider extracting common functionality');

      return false;
    }
  }

  /**
   * Genera un diagrama Mermaid de las dependencias
   */
  generateMermaidDiagram() {
    console.log('\n📈 Dependency Graph (Mermaid):');
    console.log('```mermaid');
    console.log('graph TD');

    for (const [module, deps] of this.dependencies) {
      for (const dep of deps) {
        if (this.dependencies.has(dep)) {
          console.log(`    ${module} --> ${dep}`);
        }
      }
    }

    // Highlight circular dependencies
    if (this.circularDeps.length > 0) {
      console.log('\n    %% Circular Dependencies');
      for (const cycle of this.circularDeps) {
        for (let i = 0; i < cycle.length - 1; i++) {
          console.log(`    ${cycle[i]} -.->|CIRCULAR| ${cycle[i + 1]}`);
          console.log(`    style ${cycle[i]} fill:#ffcccc`);
        }
      }
    }

    console.log('```\n');
  }
}

// Ejecutar el checker
if (require.main === module) {
  const checker = new CircularDependencyChecker();
  const isClean = checker.check();
  checker.generateMermaidDiagram();

  // Exit with error code if circular dependencies found
  process.exit(isClean ? 0 : 1);
}

module.exports = CircularDependencyChecker;
