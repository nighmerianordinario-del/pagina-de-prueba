# Dulce Limón

Página estática (HTML, CSS y JS). Sin instalación.

## Visual Studio Code
1. Abre la carpeta con **Archivo > Abrir carpeta**.
2. Instala la extensión **Live Server** y haz clic en **Go Live**.

## Supabase
1. Crea un proyecto en supabase.com.
2. En **SQL Editor**, pega y ejecuta `supabase.sql`.
3. En **Settings > API**, copia la URL y la clave `anon public` a `config.js`.
4. En **Authentication > URL Configuration**, agrega la URL de tu sitio en Vercel.

## Vercel
1. Sube la carpeta a un repositorio de GitHub (Source Control en VS Code).
2. En vercel.com: **Add New > Project**, elige el repositorio y pulsa **Deploy**.
3. Cada `git push` publica los cambios.

Cambia en `config.js`: WhatsApp, teléfono, correo y la ubicación del local (lat/lng).
