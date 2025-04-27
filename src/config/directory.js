import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs'; // Importación adicional para métodos sync

// Configuración básica de directorios
class ProjectDirectories {
  constructor() {
    // Obtiene la ruta del archivo actual (__dirname equivalente en ES modules)
    this._filename = fileURLToPath(import.meta.url);
    this._dirname = path.dirname(this._filename);

    // Estructura base de directorios
    this._basePaths = {
      root: this._findProjectRoot(),
      src: '',
      config: '',
      logs: '',
      temp: '',
      assets: ''
    };

    this._initializePaths();
    this._createEssentialDirectoriesSync(); // Crear directorios esenciales al instanciar la clase
  }



  /**
   * Busca la raíz del proyecto (donde está package.json)
   * @private
   */
  _findProjectRoot() {
    let currentDir = this._dirname;
    while (currentDir !== path.parse(currentDir).root) {
      if (existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    return this._dirname; // Fallback al directorio actual
  }

  _createEssentialDirectoriesSync() {
    const essentialDirs = {
      temp: this.getPath('temp'),
      solicitudes: path.join(this.getPath('root'), "src", 'solicitudes')
    };
    console.log(essentialDirs);

    for (const [name, dirPath] of Object.entries(essentialDirs)) {
      try {
        if (!existsSync(dirPath)) {
          mkdirSync(dirPath, { recursive: true });
          console.log(`Directorio ${name} creado: ${dirPath}`);
        }
      } catch (error) {
        console.error(`Error creando directorio ${name}:`, error.message);
        // No lanzamos error para no romper la creación de la instancia
      }
    }
  }


  /**
   * Inicializa todas las rutas basadas en el root
   * @private
   */
  _initializePaths() {
    this._basePaths = {
      root: this._basePaths.root,
      src: path.join(this._basePaths.root, 'src'),
      db: path.join(this._basePaths.root, 'src/db'),
      config: path.join(this._basePaths.root, 'src/config'),
      temp: path.join(this._basePaths.root, 'src/temp'),
      assets: path.join(this._basePaths.root, 'src/assets'),
      solicitudes: path.join(this._basePaths.root, 'src/solicitudes'),
    };
  }

  /**
   * Obtiene una ruta base específica
   * @param {string} key - Nombre del directorio base (root, src, config, etc.)
   * @returns {string} Ruta absoluta
   */
  getPath(key = 'root') {
    if (!this._basePaths[key]) {
      throw new Error(`Directorio base '${key}' no configurado`);
    }
    return this._basePaths[key];
  }

  /**
   * Crea un directorio si no existe
   * @param {string} dirPath - Ruta del directorio
   * @returns {Promise<string>} Ruta creada/verificada
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return dirPath;
    } catch (error) {
      throw new Error(`Error creando directorio ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Resuelve una ruta relativa a uno de los directorios base
   * @param {string} baseKey - Clave del directorio base
   * @param  {...string} segments - Segmentos adicionales de la ruta
   * @returns {string} Ruta absoluta resuelta
   */
  resolve(baseKey, ...segments) {
    const basePath = this.getPath(baseKey);
    return path.join(basePath, ...segments);
  }
}

// Singleton para acceso global
const directoryManager = new ProjectDirectories();

export default directoryManager;