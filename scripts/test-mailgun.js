/**
 * Script para probar el envío de correos con Mailgun usando HTML
 */

const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Configuración de Mailgun
const mailgunApiKey = 'YOUR_MAILGUN_API_KEY_HERE';
const mailgunDomain = 'sofiacall.com';
const mailgunFrom = 'hola@sofiacall.com';

// Destinatario
const recipient = 'frank@sofiallm.com';

// Contenido HTML simplificado (versión básica del template)
const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prueba de Template</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #F2F9FF; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; border: 2px solid #DBEAF2;">
    <div style="text-align: center;">
      <h1 style="color: #262626;">Bienvenido</h1>
      <p style="color: #262626;">Estamos muy contentos de tenerte como parte de Sofia.</p>
    </div>
    
    <div style="margin: 20px 0;">
      <p style="color: #262626;">Hola {{ email }},</p>
      <p style="color: #262626;">Es un placer darte la bienvenida a Sofia Chat.</p>
      <p style="color: #262626;">Nuestra plataforma está diseñada para revolucionar la manera en que interactúas con tus clientes.</p>
    </div>
    
    <div style="margin: 20px 0;">
      <p style="color: #262626;">✅ Responder automáticamente a preguntas frecuentes.</p>
      <p style="color: #262626;">✅ Gestionar conversaciones en tiempo real.</p>
      <p style="color: #262626;">✅ Ahorrar tiempo y mejorar la experiencia de tus clientes.</p>
    </div>
    
    <div style="margin: 20px 0;">
      <p style="color: #262626;">Tus credenciales de acceso:</p>
      <p style="color: #262626;">Email: <b>{{ email }}</b><br>Contraseña: <b>{{ password }}</b></p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ link }}" style="background-color: #15ecda; color: #262626; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Iniciar sesión</a>
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: #262626; font-size: 12px;">
      <p>SOF.IA LLM 2025 Derechos Reservados</p>
    </div>
  </div>
</body>
</html>`;

// Función para enviar correo
async function sendEmail() {
  console.log('=== PRUEBA DE ENVÍO DE CORREO HTML CON MAILGUN ===');
  console.log(`Fecha y hora: ${new Date().toISOString()}`);
  console.log(`Dominio: ${mailgunDomain}`);
  console.log(`Remitente: ${mailgunFrom}`);
  console.log(`Destinatario: ${recipient}`);
  console.log('\nEnviando correo de prueba con template HTML...');
  
  try {
    // Inicializar cliente de Mailgun
    const mailgun = new Mailgun.default(formData);
    const client = mailgun.client({
      username: 'api',
      key: mailgunApiKey
    });
    
    // Datos del correo
    const messageData = {
      from: mailgunFrom,
      to: recipient,
      subject: 'Prueba de Template HTML - Sofia Chat',
      html: htmlContent,
      'v:email': recipient,
      'v:password': '123456',
      'v:link': 'https://app.sofiacall.com',
      'v:frontendBaseUrl': 'https://app.sofiacall.com'
    };
    
    // Enviar correo
    console.log('Enviando correo...');
    const response = await client.messages.create(mailgunDomain, messageData);
    
    console.log('✅ Correo enviado exitosamente!');
    console.log('Respuesta:', response);
    
  } catch (error) {
    console.error('❌ Error al enviar el correo:', error);
  }
}

// Ejecutar la función
sendEmail();
