#!/bin/bash

# --- Script de Inicio y Auto-Actualización ---
# Este script se asegura de que el bot siempre esté ejecutando la última versión del código desde GitHub.

echo ">>> [Paso 1/3] Actualizando el bot desde GitHub..."
git pull

echo ">>> [Paso 2/3] Instalando/actualizando dependencias de Node.js..."
npm install --silent

echo ">>> [Paso 3/3] Iniciando el bot..."
node index.js
