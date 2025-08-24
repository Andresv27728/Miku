/*
* Este es el archivo de configuración principal del bot.
* Modifica los valores según tus necesidades.
*/

const config = {
  // El nombre que mostrará el bot en los menús y mensajes.
  botName: "JulesBot",

  // El nombre del propietario del bot.
  ownerName: "TuNombre",

  // Números de los propietarios del bot (en formato de WhatsApp, ej: '5211234567890').
  // El bot puede tener funcionalidades exclusivas para estos números.
  ownerNumbers: ["5211234567890", "otro_numero_sin_el_mas"],

  // APIs (si las tienes, si no, déjalas como están)
  // No es necesario modificar estas si usas las APIs públicas de Adonix.
  api: {
    ytmp3: "https://myapiadonix.vercel.app/api/ytmp3",
    ytmp4: "https://myapiadonix.vercel.app/api/ytmp4",
  }
};

export default config;
