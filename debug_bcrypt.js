#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

console.log('🔍 DIAGNÓSTICO DE BCRYPT - ANÁLISIS DE ENTORNO');
console.log('=' .repeat(60));

// Función para ejecutar comandos de forma segura
function safeExec(command, description) {
    try {
        const result = execSync(command, { encoding: 'utf8', timeout: 10000 }).toString().trim();
        console.log(`✅ ${description}: ${result}`);
        return result;
    } catch (error) {
        console.log(`❌ ${description}: ERROR - ${error.message}`);
        return null;
    }
}

// Función para verificar archivos
function checkFile(filePath, description) {
    try {
        const exists = fs.existsSync(filePath);
        if (exists) {
            const stats = fs.statSync(filePath);
            console.log(`✅ ${description}: EXISTS (${stats.size} bytes, ${stats.mtime})`);
            return true;
        } else {
            console.log(`❌ ${description}: NOT FOUND`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${description}: ERROR - ${error.message}`);
        return false;
    }
}

// 1. INFORMACIÓN BÁSICA DEL SISTEMA
console.log('\n📋 INFORMACIÓN DEL SISTEMA:');
console.log(`Platform: ${os.platform()}`);
console.log(`Architecture: ${os.arch()}`);
console.log(`CPU Model: ${os.cpus()[0]?.model || 'Unknown'}`);
console.log(`Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Node Version: ${process.version}`);

// 2. INFORMACIÓN DE DOCKER (si está disponible)
console.log('\n🐳 INFORMACIÓN DE DOCKER:');
safeExec('docker --version', 'Docker Version');
safeExec('docker-compose --version', 'Docker Compose Version');

// 3. INFORMACIÓN DE DISTRIBUCIÓN LINUX
console.log('\n🐧 INFORMACIÓN DE LINUX:');
safeExec('cat /etc/os-release | grep PRETTY_NAME', 'OS Distribution');
safeExec('uname -a', 'Kernel Info');
safeExec('ldd --version | head -1', 'GLIBC Version');

// 4. VERIFICACIÓN DE DEPENDENCIAS DE COMPILACIÓN
console.log('\n🔧 DEPENDENCIAS DE COMPILACIÓN:');
safeExec('which gcc', 'GCC Compiler');
safeExec('which g++', 'G++ Compiler');
safeExec('which make', 'Make');
safeExec('which python3', 'Python3');
safeExec('gcc --version | head -1', 'GCC Version');

// 5. VERIFICACIÓN DE NODE Y NPM
console.log('\n📦 NODE Y NPM:');
safeExec('node --version', 'Node Version');
safeExec('npm --version', 'NPM Version');
safeExec('which node', 'Node Path');
safeExec('which npm', 'NPM Path');

// 6. VERIFICACIÓN DE BCRYPT
console.log('\n🔐 VERIFICACIÓN DE BCRYPT:');

// Verificar si bcrypt está instalado
try {
    console.log('Intentando importar bcrypt...');
    const bcrypt = require('bcrypt');
    console.log('✅ bcrypt: IMPORTADO CORRECTAMENTE');

    // Información sobre el módulo bcrypt
    const bcryptPath = require.resolve('bcrypt');
    console.log(`📍 bcrypt path: ${bcryptPath}`);

    checkFile(bcryptPath, 'bcrypt main file');

    // Verificar binarios nativos
    const bcryptDir = bcryptPath.replace('/bcrypt.js', '');
    const possibleBinaries = [
        `${bcryptDir}/lib/binding/napi-v3/bcrypt_lib.node`,
        `${bcryptDir}/lib/binding/bcrypt_lib.node`,
        `${bcryptDir}/build/Release/bcrypt_lib.node`
    ];

    console.log('\n🔍 BINARIOS NATIVOS DE BCRYPT:');
    possibleBinaries.forEach((binPath, index) => {
        checkFile(binPath, `Binary ${index + 1}`);
    });

    // Prueba básica de funcionalidad
    console.log('\n🧪 PRUEBA DE FUNCIONALIDAD:');
    try {
        const testPassword = 'test123';
        const salt = bcrypt.genSaltSync(10);
        console.log('✅ genSaltSync: FUNCIONA');

        const hash = bcrypt.hashSync(testPassword, salt);
        console.log('✅ hashSync: FUNCIONA');

        const isValid = bcrypt.compareSync(testPassword, hash);
        console.log(`✅ compareSync: ${isValid ? 'FUNCIONA' : 'FALLA'}`);

        // Prueba asíncrona
        bcrypt.hash(testPassword, 10, (err, asyncHash) => {
            if (err) {
                console.log('❌ hash async: ERROR - ' + err.message);
            } else {
                console.log('✅ hash async: FUNCIONA');
            }
        });

    } catch (funcError) {
        console.log('❌ PRUEBA DE FUNCIONALIDAD: ERROR - ' + funcError.message);
        console.log('Stack:', funcError.stack);
    }

} catch (importError) {
    console.log('❌ bcrypt: NO SE PUEDE IMPORTAR - ' + importError.message);
    console.log('Stack:', importError.stack);

    // Verificar si el directorio node_modules/bcrypt existe
    checkFile('./node_modules/bcrypt', 'bcrypt directory');
    checkFile('./node_modules/bcrypt/package.json', 'bcrypt package.json');
}

// 7. INFORMACIÓN DEL PROYECTO
console.log('\n📁 INFORMACIÓN DEL PROYECTO:');
checkFile('./package.json', 'Project package.json');
checkFile('./node_modules', 'node_modules directory');
checkFile('./dist', 'dist directory');

// Verificar package.json
try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log(`📦 bcrypt version in package.json: ${packageJson.dependencies?.bcrypt || 'NOT FOUND'}`);
    console.log(`📦 bcryptjs version in package.json: ${packageJson.dependencies?.bcryptjs || 'NOT FOUND'}`);
} catch (error) {
    console.log('❌ Error reading package.json: ' + error.message);
}

// 8. INFORMACIÓN DE VARIABLES DE ENTORNO
console.log('\n🌍 VARIABLES DE ENTORNO RELEVANTES:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS || 'undefined'}`);
console.log(`npm_config_cache: ${process.env.npm_config_cache || 'undefined'}`);

// 9. INFORMACIÓN DE PROCESOS
console.log('\n⚙️ INFORMACIÓN DE PROCESOS:');
safeExec('ps aux | grep node | grep -v grep | wc -l', 'Node processes count');
safeExec('ps aux | grep docker | grep -v grep | wc -l', 'Docker processes count');

// 10. VERIFICACIÓN DE PERMISOS
console.log('\n🔒 VERIFICACIÓN DE PERMISOS:');
safeExec('id', 'Current user');
safeExec('ls -la ./node_modules | head -5', 'node_modules permissions');

console.log('\n' + '='.repeat(60));
console.log('🏁 DIAGNÓSTICO COMPLETADO');
console.log('💡 Guarda este output y compáralo entre servidores');
console.log('='.repeat(60));
