// Resend email client integration
// Using Replit Resend connector for email sending

import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@cogniboost.co'
  };
}

// Email template types
export type EmailTemplate = 'welcome' | 'onboarding_reminder' | 'course_enrolled' | 'lesson_completed' | 'subscription_activated';

// Send email using template
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, string>
) {
  try {
    const { client, fromEmail } = await getResendClient();
    const { subject, html } = getEmailTemplate(template, data);

    const result = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html
    });

    console.log(`Email sent to ${to}: ${template}`, result);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
}

// Email templates in Spanish
function getEmailTemplate(template: EmailTemplate, data: Record<string, string>): { subject: string; html: string } {
  const templates: Record<EmailTemplate, { subject: string; html: string }> = {
    welcome: {
      subject: '¡Bienvenido a CogniBoost! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; }
            h1 { color: #33CBFB; font-family: Impact, 'Arial Black', sans-serif; margin: 0; }
            p { line-height: 1.6; color: #cccccc; }
            .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
            .highlight { color: #FD335A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Hola ${data.firstName || 'estudiante'}!</h1>
            <p>Te damos la más cordial bienvenida a <strong>CogniBoost</strong>, tu nueva plataforma para dominar el inglés.</p>
            <p>Estamos emocionados de acompañarte en este viaje de aprendizaje. Con nuestros cursos diseñados especialmente para hispanohablantes y nuestros <span class="highlight">Laboratorios de Conversación en Vivo</span>, lograrás tus metas más rápido de lo que imaginas.</p>
            <p><strong>Tu próximo paso:</strong></p>
            <p>Completa tu perfil de aprendizaje para que podamos personalizar tu experiencia.</p>
            <a href="${data.onboardingUrl || 'https://cogniboost.co/onboarding'}" class="cta">COMPLETAR MI PERFIL</a>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>¡Nos vemos en clase!</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    onboarding_reminder: {
      subject: '¡Completa tu perfil y empieza a aprender! 📚',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; }
            h1 { color: #33CBFB; font-family: Impact, 'Arial Black', sans-serif; margin: 0; }
            p { line-height: 1.6; color: #cccccc; }
            .cta { display: inline-block; background: #FD335A; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Te estamos esperando, ${data.firstName || 'estudiante'}!</h1>
            <p>Notamos que aún no has completado tu perfil de aprendizaje. Esto solo toma 2 minutos y nos ayuda a:</p>
            <ul style="color: #cccccc;">
              <li>Recomendarte cursos perfectos para tu nivel</li>
              <li>Sugerirte Laboratorios de Conversación ideales</li>
              <li>Personalizar tu experiencia de aprendizaje</li>
            </ul>
            <a href="${data.onboardingUrl || 'https://cogniboost.co/onboarding'}" class="cta">COMPLETAR AHORA</a>
            <p>¡Tu viaje hacia la fluidez en inglés comienza con un simple clic!</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    course_enrolled: {
      subject: '¡Inscripción confirmada! 🎓',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; }
            h1 { color: #33CBFB; font-family: Impact, 'Arial Black', sans-serif; margin: 0; }
            p { line-height: 1.6; color: #cccccc; }
            .course-card { background: #2a2a2a; padding: 20px; margin: 20px 0; border-left: 4px solid #33CBFB; }
            .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Felicidades, ${data.firstName || 'estudiante'}!</h1>
            <p>Te has inscrito exitosamente en un nuevo curso:</p>
            <div class="course-card">
              <h2 style="color: #ffffff; margin: 0;">${data.courseName || 'Curso'}</h2>
              <p style="margin: 10px 0 0 0;">Nivel: ${data.courseLevel || 'N/A'}</p>
            </div>
            <p>Ya puedes comenzar tu primera lección. ¡No esperes más!</p>
            <a href="${data.courseUrl || 'https://cogniboost.co/dashboard'}" class="cta">IR AL CURSO</a>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    lesson_completed: {
      subject: '¡Lección completada! ⭐',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; }
            h1 { color: #33CBFB; font-family: Impact, 'Arial Black', sans-serif; margin: 0; }
            p { line-height: 1.6; color: #cccccc; }
            .progress { background: #2a2a2a; padding: 20px; text-align: center; margin: 20px 0; }
            .progress-bar { background: #333333; height: 20px; margin: 10px 0; }
            .progress-fill { background: #33CBFB; height: 100%; width: ${data.progress || '0'}%; }
            .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Excelente trabajo, ${data.firstName || 'estudiante'}!</h1>
            <p>Has completado la lección: <strong>${data.lessonName || 'Lección'}</strong></p>
            <div class="progress">
              <p>Tu progreso en el curso:</p>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
              <p style="font-size: 24px; color: #33CBFB; margin: 0;">${data.progress || '0'}%</p>
            </div>
            <p>¡Sigue así! Cada lección te acerca más a tu meta.</p>
            <a href="${data.nextLessonUrl || 'https://cogniboost.co/dashboard'}" class="cta">SIGUIENTE LECCIÓN</a>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    subscription_activated: {
      subject: '¡Tu suscripción está activa! 🚀',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; }
            h1 { color: #33CBFB; font-family: Impact, 'Arial Black', sans-serif; margin: 0; }
            p { line-height: 1.6; color: #cccccc; }
            .plan { background: linear-gradient(135deg, #33CBFB 0%, #FD335A 100%); padding: 30px; text-align: center; margin: 20px 0; }
            .plan h2 { color: #ffffff; margin: 0; font-size: 28px; }
            .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Bienvenido al plan ${data.planName || 'Premium'}, ${data.firstName || 'estudiante'}!</h1>
            <div class="plan">
              <h2>PLAN ${(data.planName || 'PREMIUM').toUpperCase()}</h2>
              <p style="color: #ffffff; margin: 10px 0 0 0;">Acceso completo activado</p>
            </div>
            <p>Ahora tienes acceso a:</p>
            <ul style="color: #cccccc;">
              <li>Todos los cursos de nivel A1-C2</li>
              <li>Laboratorios de Conversación ilimitados</li>
              <li>Quizzes y certificaciones</li>
              <li>Soporte prioritario</li>
            </ul>
            <a href="${data.dashboardUrl || 'https://cogniboost.co/dashboard'}" class="cta">IR A MI DASHBOARD</a>
            <p>¡Aprovecha al máximo tu suscripción!</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  };

  return templates[template];
}
