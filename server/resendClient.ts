// Resend email client integration
// Using Replit Resend connector for email sending

import { Resend } from 'resend';

const DEFAULT_FROM_EMAIL = 'info@inscripciones.cogniboost.co';

async function getCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  // Priority 1: Direct RESEND_API_KEY env var (Railway / any non-Replit host)
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    };
  }

  // Priority 2: Replit Connectors API (only on Replit)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('No email credentials configured. Set RESEND_API_KEY environment variable.');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected via Replit connector');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email || DEFAULT_FROM_EMAIL };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

// Email template types
export type EmailTemplate = 'welcome' | 'onboarding_reminder' | 'course_enrolled' | 'lesson_completed' | 'subscription_activated' | 'placement_quiz_result' | 'lead_day1_followup' | 'lead_day3_lab_invite' | 'lead_day7_offer' | 'class_booking_confirmation' | 'class_booking_notification' | 'demo_booking_confirmation' | 'demo_booking_notification' | 'student_invitation' | 'email_verification' | 'staff_invitation' | 'password_reset' | 'onboarding_day2_quickwin' | 'onboarding_day5_social_proof' | 'onboarding_day7_feature' | 'trial_ending' | 'trial_expired' | 'reengagement' | 'payment_failed' | 'weekly_progress' | 'admin_subscription_notification';

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
      subject: '¡Tu suscripción está activa! 🚀 Empieza tu onboarding',
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
            .step { background: #2a2a2a; padding: 20px; margin: 15px 0; border-left: 4px solid #33CBFB; }
            .step-number { display: inline-block; background: #33CBFB; color: #000; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; margin-right: 10px; }
            .step h3 { color: #ffffff; margin: 0 0 10px 0; display: inline; }
            .step p { margin: 10px 0 0 0; color: #999999; }
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
            <p><strong>Tu acceso está listo.</strong> Ahora sigue estos 3 pasos para comenzar:</p>
            <div class="step">
              <span class="step-number">1</span>
              <h3>Accede a tu Dashboard</h3>
              <p>Inicia sesión y explora tu nuevo espacio de aprendizaje personalizado.</p>
            </div>
            <div class="step">
              <span class="step-number">2</span>
              <h3>Toma el Quiz de Nivel</h3>
              <p>Descubre tu nivel actual para recomendarte los cursos perfectos.</p>
            </div>
            <div class="step">
              <span class="step-number">3</span>
              <h3>Reserva tu Primer Class Lab</h3>
              <p>Practica conversación en vivo con otros estudiantes de tu nivel.</p>
            </div>
            <p style="text-align: center;">
              <a href="${data.dashboardUrl || 'https://cogniboost.co/dashboard'}" class="cta">EMPEZAR AHORA</a>
            </p>
            <p>Ahora tienes acceso a:</p>
            <ul style="color: #cccccc;">
              <li>Todos los cursos de nivel A1-C2</li>
              <li>Class Labs (Laboratorios de Conversación) en vivo</li>
              <li>Quizzes interactivos y certificaciones</li>
              <li>Instructores nativos nivel C2</li>
              <li>Soporte prioritario</li>
            </ul>
            <p>¿Tienes preguntas? Responde a este email y te ayudamos.</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    placement_quiz_result: {
      subject: '🎯 Resultado de tu Examen de Nivel de Inglés',
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
            .result-card { background: linear-gradient(135deg, #33CBFB 0%, #1a8ab5 100%); padding: 30px; text-align: center; margin: 20px 0; }
            .result-card h2 { color: #ffffff; margin: 0; font-size: 48px; font-family: Impact, 'Arial Black', sans-serif; }
            .result-card p { color: #ffffff; margin: 10px 0 0 0; font-size: 18px; }
            .stats { background: #2a2a2a; padding: 20px; margin: 20px 0; display: flex; justify-content: space-around; text-align: center; }
            .stat { flex: 1; }
            .stat-value { font-size: 24px; color: #33CBFB; font-weight: bold; }
            .stat-label { font-size: 12px; color: #888888; text-transform: uppercase; }
            .level-desc { background: #2a2a2a; padding: 20px; margin: 20px 0; border-left: 4px solid #FD335A; }
            .cta { display: inline-block; background: #FD335A; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Felicidades, ${data.firstName || 'estudiante'}!</h1>
            <p>Has completado tu Examen de Nivel de Inglés. Aquí están tus resultados:</p>
            <div class="result-card">
              <h2>NIVEL ${data.level || 'B1'}</h2>
              <p>${data.levelDescription || 'Intermedio'}</p>
            </div>
            <table style="width: 100%; background: #2a2a2a; padding: 20px; margin: 20px 0;">
              <tr>
                <td style="text-align: center; padding: 15px;">
                  <div style="font-size: 24px; color: #33CBFB; font-weight: bold;">${data.correctAnswers || '0'}/${data.totalQuestions || '8'}</div>
                  <div style="font-size: 12px; color: #888888; text-transform: uppercase;">Respuestas Correctas</div>
                </td>
                <td style="text-align: center; padding: 15px;">
                  <div style="font-size: 24px; color: #33CBFB; font-weight: bold;">${data.confidence || 'Media'}</div>
                  <div style="font-size: 12px; color: #888888; text-transform: uppercase;">Confianza</div>
                </td>
              </tr>
            </table>
            <div class="level-desc">
              <p style="margin: 0;"><strong>¿Qué significa nivel ${data.level || 'B1'}?</strong></p>
              <p style="margin: 10px 0 0 0;">${data.levelExplanation || 'Puedes desenvolverte en situaciones cotidianas y expresar experiencias y opiniones básicas.'}</p>
            </div>
            <div style="background: linear-gradient(135deg, #FD335A 0%, #c4264a 100%); padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 10px 0; font-weight: bold;">¡Es el momento perfecto para dar el siguiente paso!</p>
              <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px 0;">Ya conoces tu nivel. Ahora elige el plan que te llevará a la fluidez.</p>
              <a href="https://cogniboost.co/#pricing" style="display: inline-block; background: #ffffff; color: #FD335A; padding: 15px 35px; text-decoration: none; font-weight: bold; border-radius: 4px; font-size: 16px;">VER PLANES Y PRECIOS</a>
            </div>
            <p style="text-align: center; color: #888888; margin: 15px 0;">¿Prefieres probar primero?</p>
            <p style="text-align: center;">
              <a href="https://cogniboost.co/#live-labs" style="color: #33CBFB; font-weight: bold; text-decoration: none;">Agenda una clase gratis de prueba →</a>
            </p>
            <p>¡Estamos emocionados de acompañarte en tu viaje hacia la fluidez en inglés!</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    lead_day1_followup: {
      subject: `📚 Cursos recomendados para tu nivel ${data.level || ""}`,
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
            .course-card { background: #2a2a2a; padding: 20px; margin: 15px 0; border-left: 4px solid #33CBFB; }
            .course-card h3 { color: #ffffff; margin: 0 0 10px 0; }
            .course-card p { margin: 0; color: #999999; }
            .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Hola ${data.firstName || 'estudiante'}!</h1>
            <p>Basándonos en tu resultado de nivel <strong>${data.level || 'B1'}</strong>, hemos seleccionado los cursos perfectos para ti:</p>
            <div class="course-card">
              <h3>Inglés de Negocios - ${data.level || 'B1'}</h3>
              <p>Domina el vocabulario profesional y las presentaciones en inglés.</p>
            </div>
            <div class="course-card">
              <h3>Conversaciones Cotidianas - ${data.level || 'B1'}</h3>
              <p>Practica situaciones del día a día con confianza.</p>
            </div>
            <div class="course-card">
              <h3>Gramática Esencial - ${data.level || 'B1'}</h3>
              <p>Refuerza las estructuras gramaticales clave de tu nivel.</p>
            </div>
            <p>Cada curso incluye lecciones en video, ejercicios prácticos y quizzes interactivos.</p>
            <a href="https://cogniboost.co" class="cta">VER TODOS LOS CURSOS</a>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
              <p style="font-size: 10px; margin-top: 10px;"><a href="https://cogniboost.co/unsubscribe?email=${data.email || ''}" style="color: #666666;">Cancelar suscripción</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    lead_day3_lab_invite: {
      subject: '🎙️ Practica inglés EN VIVO con otros estudiantes',
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
            .highlight-box { background: linear-gradient(135deg, #33CBFB 0%, #1a8ab5 100%); padding: 30px; text-align: center; margin: 20px 0; }
            .highlight-box h2 { color: #ffffff; margin: 0; font-size: 24px; }
            .highlight-box p { color: #ffffff; margin: 10px 0 0 0; }
            .benefit { display: flex; align-items: flex-start; margin: 15px 0; }
            .benefit-icon { color: #FD335A; font-size: 20px; margin-right: 10px; }
            .cta { display: inline-block; background: #FD335A; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¿Listo para hablar inglés, ${data.firstName || 'estudiante'}?</h1>
            <p>Sabemos que practicar conversación es la parte más difícil de aprender inglés. Por eso creamos los <strong>Laboratorios de Conversación</strong>.</p>
            <div class="highlight-box">
              <h2>LABORATORIOS EN VIVO</h2>
              <p>Sesiones grupales de práctica con estudiantes de tu nivel</p>
            </div>
            <p><strong>Lo que obtienes:</strong></p>
            <ul style="color: #cccccc; padding-left: 20px;">
              <li style="margin: 10px 0;">Grupos pequeños (máx. 6 personas) de nivel ${data.level || 'B1'}</li>
              <li style="margin: 10px 0;">Temas variados: negocios, viajes, tecnología, cultura</li>
              <li style="margin: 10px 0;">Moderador que guía la conversación</li>
              <li style="margin: 10px 0;">Feedback personalizado al final</li>
              <li style="margin: 10px 0;">Sin juzgamientos - todos estamos aprendiendo</li>
            </ul>
            <p>Tu primer laboratorio es <strong>GRATIS</strong> para que pruebes sin compromiso.</p>
            <a href="https://cogniboost.co" class="cta">RESERVAR MI LABORATORIO GRATIS</a>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
              <p style="font-size: 10px; margin-top: 10px;"><a href="https://cogniboost.co/unsubscribe?email=${data.email || ''}" style="color: #666666;">Cancelar suscripción</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    lead_day7_offer: {
      subject: '🎁 Oferta especial: 50% OFF en tu primer mes',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'JetBrains Mono', monospace; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; }
            h1 { color: #FD335A; font-family: Impact, 'Arial Black', sans-serif; margin: 0; }
            p { line-height: 1.6; color: #cccccc; }
            .offer-box { background: linear-gradient(135deg, #FD335A 0%, #c4264a 100%); padding: 30px; text-align: center; margin: 20px 0; }
            .offer-box h2 { color: #ffffff; margin: 0; font-size: 48px; }
            .offer-box p { color: #ffffff; margin: 10px 0 0 0; font-size: 18px; }
            .price-compare { text-align: center; margin: 20px 0; }
            .old-price { color: #888888; text-decoration: line-through; font-size: 24px; }
            .new-price { color: #33CBFB; font-size: 36px; font-weight: bold; }
            .timer { background: #2a2a2a; padding: 15px; text-align: center; margin: 20px 0; color: #FD335A; font-weight: bold; }
            .cta { display: inline-block; background: #FD335A; color: #ffffff; padding: 20px 40px; text-decoration: none; font-weight: bold; margin: 20px 0; font-size: 18px; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Última oportunidad, ${data.firstName || 'estudiante'}!</h1>
            <p>Hace una semana completaste tu examen de nivel y descubriste que estás en <strong>nivel ${data.level || 'B1'}</strong>.</p>
            <p>Queremos ayudarte a dar el siguiente paso con una oferta que no podrás rechazar:</p>
            <div class="offer-box">
              <h2>50% OFF</h2>
              <p>En tu primer mes de suscripción Premium</p>
            </div>
            <div class="price-compare">
              <div class="old-price">$79 USD/mes</div>
              <div class="new-price">$39.50 USD</div>
              <p style="color: #888888;">Solo tu primer mes</p>
            </div>
            <p><strong>Con Premium obtienes:</strong></p>
            <ul style="color: #cccccc; padding-left: 20px;">
              <li style="margin: 10px 0;">Acceso a TODOS los cursos (A1 a C2)</li>
              <li style="margin: 10px 0;">Laboratorios de conversación ILIMITADOS</li>
              <li style="margin: 10px 0;">Quizzes y certificaciones oficiales</li>
              <li style="margin: 10px 0;">Soporte prioritario</li>
            </ul>
            <div class="timer">
              Esta oferta expira en 48 horas
            </div>
            <a href="https://cogniboost.co?offer=WELCOME50" class="cta">ACTIVAR MI 50% OFF</a>
            <p style="text-align: center; color: #888888; font-size: 12px;">Usa el código: WELCOME50</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
              <p style="font-size: 10px; margin-top: 10px;"><a href="https://cogniboost.co/unsubscribe?email=${data.email || ''}" style="color: #666666;">Cancelar suscripción</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    class_booking_confirmation: {
      subject: '¡Tu clase gratis está confirmada!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8f9fa; color: #1a1a40; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: bold; color: #667EEA; }
            h1 { color: #1a1a40; margin: 0; font-size: 24px; }
            p { line-height: 1.6; color: #4a4a4a; }
            .class-card { background: linear-gradient(135deg, #667EEA 0%, #4FD1C5 100%); padding: 25px; margin: 20px 0; border-radius: 8px; color: #ffffff; }
            .class-card h2 { margin: 0 0 15px 0; font-size: 22px; }
            .class-details { background: rgba(255,255,255,0.15); padding: 15px; border-radius: 4px; margin-top: 15px; }
            .class-details p { color: #ffffff; margin: 5px 0; }
            .tips { background: #f0f4ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667EEA; }
            .tips h3 { color: #667EEA; margin: 0 0 10px 0; }
            .tips ul { margin: 0; padding-left: 20px; color: #4a4a4a; }
            .tips li { margin: 8px 0; }
            .cta { display: inline-block; background: #667EEA; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888888; font-size: 12px; }
            .highlight { color: #4FD1C5; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CogniBoost</div>
            </div>
            <h1>¡Hola ${data.firstName || 'estudiante'}!</h1>
            <p>Tu clase gratis ha sido <span class="highlight">confirmada exitosamente</span>. Aquí están los detalles:</p>
            <div class="class-card">
              <h2>${data.sessionTitle || 'Clase de Práctica'}</h2>
              <div class="class-details">
                <p><strong>Fecha:</strong> ${data.sessionDate || 'Por confirmar'}</p>
                <p><strong>Hora:</strong> ${data.sessionTime || 'Por confirmar'}</p>
                <p><strong>Tema:</strong> ${data.roomTopic || 'Conversación General'}</p>
                <p><strong>Nivel:</strong> ${data.roomLevel || 'Todos los niveles'}</p>
                <p><strong>Duración:</strong> ${data.sessionDuration || '45'} minutos</p>
                ${data.meetingUrl ? '<p style="margin-top: 15px;"><strong>Link de la clase:</strong></p><p><a href="' + data.meetingUrl + '" style="color: #ffffff; background: rgba(255,255,255,0.2); padding: 8px 15px; border-radius: 4px; text-decoration: none; display: inline-block; margin-top: 5px;">' + data.meetingUrl + '</a></p>' : '<p style="margin-top: 10px;"><em>Te enviaremos el link de la reunión antes de la clase.</em></p>'}
              </div>
            </div>
            <div class="tips">
              <h3>Prepárate para tu clase:</h3>
              <ul>
                <li>Asegúrate de tener buena conexión a internet</li>
                <li>Busca un lugar tranquilo sin distracciones</li>
                <li>Ten a la mano audífonos con micrófono</li>
                <li>Llega 5 minutos antes para probar tu audio</li>
              </ul>
            </div>
            <p>Te enviaremos un recordatorio antes de la clase con el enlace para unirte.</p>
            <p>¡Nos vemos pronto!</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>CogniBoost - Desarrollo Profesional</p>
              <p>PMB 1420, 10900 Research Blvd Ste 160C, Austin, TX 78759</p>
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    class_booking_notification: {
      subject: 'Nueva reserva de clase gratis',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8f9fa; color: #1a1a40; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #667EEA; }
            .logo { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: bold; color: #667EEA; }
            .badge { background: #4FD1C5; color: #ffffff; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px; }
            h1 { color: #1a1a40; margin: 0; font-size: 22px; }
            p { line-height: 1.6; color: #4a4a4a; }
            .info-section { margin: 20px 0; }
            .info-section h3 { color: #667EEA; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
            .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; }
            .info-row { display: flex; margin: 10px 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
            .info-row:last-child { border-bottom: none; padding-bottom: 0; }
            .info-label { color: #888888; width: 120px; font-size: 14px; }
            .info-value { color: #1a1a40; font-weight: 500; }
            .footer { text-align: center; margin-top: 30px; color: #888888; font-size: 12px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CogniBoost Admin</div>
              <div class="badge">NUEVA RESERVA</div>
            </div>
            <h1>Se ha registrado una nueva reserva de clase gratis</h1>
            
            <div class="info-section">
              <h3>Información del Estudiante</h3>
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">${data.studentName || 'No proporcionado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${data.studentEmail || 'No proporcionado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Teléfono:</span>
                  <span class="info-value">${data.studentPhone || 'No proporcionado'}</span>
                </div>
              </div>
            </div>
            
            <div class="info-section">
              <h3>Detalles de la Clase</h3>
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Sesión:</span>
                  <span class="info-value">${data.sessionTitle || 'Clase de Práctica'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fecha:</span>
                  <span class="info-value">${data.sessionDate || 'Por confirmar'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Hora:</span>
                  <span class="info-value">${data.sessionTime || 'Por confirmar'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Tema:</span>
                  <span class="info-value">${data.roomTopic || 'Conversación General'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Nivel:</span>
                  <span class="info-value">${data.roomLevel || 'Todos los niveles'}</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>Este es un correo automático del sistema CogniBoost</p>
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    demo_booking_confirmation: {
      subject: '¡Tu demo de 15 minutos está confirmado!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8f9fa; color: #1a1a40; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: bold; color: #667EEA; }
            h1 { color: #1a1a40; margin: 0; font-size: 24px; }
            p { line-height: 1.6; color: #4a4a4a; }
            .demo-card { background: linear-gradient(135deg, #F6AD55 0%, #ED8936 100%); padding: 25px; margin: 20px 0; border-radius: 8px; color: #ffffff; }
            .demo-card h2 { margin: 0 0 15px 0; font-size: 22px; }
            .demo-details { background: rgba(255,255,255,0.15); padding: 15px; border-radius: 4px; margin-top: 15px; }
            .demo-details p { color: #ffffff; margin: 5px 0; }
            .meeting-link { background: #667EEA; color: #ffffff; padding: 15px 25px; border-radius: 4px; text-decoration: none; display: inline-block; margin: 15px 0; font-weight: bold; }
            .what-to-expect { background: #fff3e0; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #F6AD55; }
            .what-to-expect h3 { color: #ED8936; margin: 0 0 10px 0; }
            .what-to-expect ul { margin: 0; padding-left: 20px; color: #4a4a4a; }
            .what-to-expect li { margin: 8px 0; }
            .cta { display: inline-block; background: #667EEA; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888888; font-size: 12px; }
            .highlight { color: #F6AD55; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CogniBoost</div>
            </div>
            <h1>¡Hola \${data.firstName || 'estudiante'}!</h1>
            <p>Tu <span class="highlight">demo personalizado de 15 minutos</span> ha sido confirmado. En esta sesión conocerás cómo CogniBoost puede ayudarte a alcanzar tus metas de inglés.</p>
            <div class="demo-card">
              <h2>Demo Personalizado</h2>
              <div class="demo-details">
                <p><strong>Fecha:</strong> \${data.sessionDate || 'Por confirmar'}</p>
                <p><strong>Hora:</strong> \${data.sessionTime || 'Por confirmar'}</p>
                <p><strong>Duración:</strong> 15 minutos</p>
                \${data.meetingUrl ? '<p><strong>Link:</strong> <a href="' + data.meetingUrl + '" style="color: #ffffff;">' + data.meetingUrl + '</a></p>' : '<p><em>Te enviaremos el link de la reunión pronto.</em></p>'}
              </div>
            </div>
            <div class="what-to-expect">
              <h3>¿Qué esperar en tu demo?</h3>
              <ul>
                <li>Conocerás la plataforma y sus funcionalidades</li>
                <li>Responderemos todas tus preguntas</li>
                <li>Te mostraremos los cursos ideales para tu nivel</li>
                <li>Recibirás una oferta exclusiva al final</li>
              </ul>
            </div>
            <p>¡Nos vemos pronto!</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>CogniBoost - Desarrollo Profesional</p>
              <p>PMB 1420, 10900 Research Blvd Ste 160C, Austin, TX 78759</p>
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    demo_booking_notification: {
      subject: 'Nueva reserva de DEMO - 15 min',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8f9fa; color: #1a1a40; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #F6AD55; }
            .logo { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: bold; color: #667EEA; }
            .badge { background: #F6AD55; color: #ffffff; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px; }
            h1 { color: #1a1a40; margin: 0; font-size: 22px; }
            p { line-height: 1.6; color: #4a4a4a; }
            .info-section { margin: 20px 0; }
            .info-section h3 { color: #F6AD55; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
            .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; }
            .info-row { display: flex; margin: 10px 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
            .info-row:last-child { border-bottom: none; padding-bottom: 0; }
            .info-label { color: #888888; width: 120px; font-size: 14px; }
            .info-value { color: #1a1a40; font-weight: 500; }
            .action-required { background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #F6AD55; margin: 20px 0; }
            .action-required p { margin: 0; color: #ED8936; font-weight: 500; }
            .footer { text-align: center; margin-top: 30px; color: #888888; font-size: 12px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CogniBoost Admin</div>
              <div class="badge">NUEVO DEMO</div>
            </div>
            <h1>Se ha registrado una nueva solicitud de DEMO (15 min)</h1>
            
            <div class="action-required">
              <p>Acción requerida: Preparar demo personalizado de 15 minutos</p>
            </div>
            
            <div class="info-section">
              <h3>Información del Prospecto</h3>
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">\${data.studentName || 'No proporcionado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">\${data.studentEmail || 'No proporcionado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Teléfono:</span>
                  <span class="info-value">\${data.studentPhone || 'No proporcionado'}</span>
                </div>
              </div>
            </div>
            
            <div class="info-section">
              <h3>Detalles del Demo</h3>
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Tipo:</span>
                  <span class="info-value">Demo Personalizado (15 min)</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fecha:</span>
                  <span class="info-value">\${data.sessionDate || 'Por confirmar'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Hora:</span>
                  <span class="info-value">\${data.sessionTime || 'Por confirmar'}</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p>Este es un correo automático del sistema CogniBoost</p>
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    student_invitation: {
      subject: '¡Has sido invitado a CogniBoost! 🎓',
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
            .plan-badge { display: inline-block; background: #667EEA; color: #ffffff; padding: 8px 20px; border-radius: 4px; font-weight: bold; margin: 15px 0; }
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
            <p>Has sido invitado a unirte a <strong>CogniBoost</strong>, la plataforma líder para dominar el inglés.</p>
            <p>Se te ha asignado el siguiente plan:</p>
            <div class="plan-badge">${data.planName || 'Plan Asignado'}</div>
            <p>Para completar tu registro y comenzar a aprender, haz clic en el siguiente botón:</p>
            <a href="${data.activationUrl || 'https://cogniboost.co'}" class="cta">ACTIVAR MI CUENTA</a>
            <p>Una vez que actives tu cuenta, tendrás acceso a:</p>
            <ul style="color: #cccccc;">
              <li>Cursos diseñados para hispanohablantes</li>
              <li>Laboratorios de Conversación en Vivo</li>
              <li>Seguimiento de tu progreso</li>
              <li>Certificados de completación</li>
            </ul>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    email_verification: {
      subject: 'Verifica tu correo electrónico - CogniBoost',
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
            .warning { color: #F6AD55; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Verifica tu correo, ${data.firstName || 'estudiante'}!</h1>
            <p>Gracias por registrarte en <strong>CogniBoost</strong>.</p>
            <p>Para completar tu registro y acceder a todas las funciones, por favor verifica tu correo electrónico haciendo clic en el siguiente botón:</p>
            <a href="${data.verificationUrl || 'https://cogniboost.co'}" class="cta">VERIFICAR MI CORREO</a>
            <p class="warning">Este enlace expira en 24 horas. Si no solicitaste esta verificación, puedes ignorar este correo.</p>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    staff_invitation: {
      subject: `¡Invitación a unirte al equipo de CogniBoost como ${data.role === 'admin' ? 'Administrador' : 'Instructor'}!`,
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
            .cta { display: inline-block; background: #667EEA; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
            .warning { color: #F6AD55; font-size: 14px; margin-top: 20px; }
            .role-badge { display: inline-block; background: ${data.role === 'admin' ? '#667EEA' : '#4FD1C5'}; color: #ffffff; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>¡Hola ${data.firstName || ''}!</h1>
            <p>Has sido invitado/a a unirte al equipo de <strong>CogniBoost</strong> como:</p>
            <p style="text-align: center;"><span class="role-badge">${data.role === 'admin' ? 'Administrador' : 'Instructor'}</span></p>
            <p>Esta invitación fue enviada por <strong>${data.invitedByName || 'un administrador'}</strong>.</p>
            <p><strong>Para aceptar la invitación:</strong></p>
            <ol style="color: #cccccc; line-height: 2;">
              <li>Haz clic en el botón de abajo</li>
              <li>Inicia sesión con tu cuenta</li>
              <li>Tu rol será asignado automáticamente</li>
            </ol>
            <p style="text-align: center;">
              <a href="${data.invitationUrl}" class="cta">ACEPTAR INVITACIÓN</a>
            </p>
            <p class="warning">Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.</p>
            <p>Si tienes alguna pregunta, contacta al administrador que te invitó.</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    password_reset: {
      subject: 'Restablecer tu contraseña - CogniBoost',
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
            .warning { color: #F6AD55; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">COGNIBOOST</div>
            </div>
            <h1>Restablecer contraseña</h1>
            <p>Hola ${data.firstName || 'estudiante'},</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>CogniBoost</strong>.</p>
            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <a href="${data.resetUrl || 'https://cogniboost.co'}" class="cta">RESTABLECER MI CONTRASEÑA</a>
            <p class="warning">Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña no será modificada.</p>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p><strong>El equipo de CogniBoost</strong></p>
            <div class="footer">
              <p>© 2026 CogniBoost. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },
    // ===== EMAIL SEQUENCE: Onboarding Day 2 — Quick Win =====
    onboarding_day2_quickwin: {
      subject: '¡Tu primera lección te espera! Aprende en 10 minutos',
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #33CBFB; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .tip { background: #2a2a2a; padding: 20px; margin: 20px 0; border-left: 4px solid #4FD1C5; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>¡Hola ${data.firstName || 'estudiante'}!</h1>
            <p>Sabemos que empezar algo nuevo puede sentirse abrumador, pero aquí va un secreto: <strong>solo necesitas 10 minutos para tu primera victoria.</strong></p>
            <div class="tip">
              <p style="color: #4FD1C5; font-weight: bold; margin: 0 0 10px 0;">Tu Quick Win de hoy:</p>
              <p style="margin: 0;">Completa la primera lección de tu curso. Es corta, interactiva y te dará la confianza de que esto funciona.</p>
            </div>
            <p>Los estudiantes que completan su primera lección en las primeras 48 horas tienen <strong>3x más probabilidad</strong> de alcanzar sus metas de inglés.</p>
            <a href="${data.dashboardUrl || 'https://cogniboost.co/dashboard'}" class="cta">EMPEZAR MI PRIMERA LECCIÓN</a>
            <p>¿Tienes preguntas? Responde a este email y te ayudamos.</p>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },
    // ===== EMAIL SEQUENCE: Onboarding Day 5 — Social Proof =====
    onboarding_day5_social_proof: {
      subject: 'Cómo María pasó de A2 a B2 en 4 meses',
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #33CBFB; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .quote { background: #2a2a2a; padding: 25px; margin: 20px 0; border-left: 4px solid #FD335A; font-style: italic; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>${data.firstName || 'Estudiante'}, conoce a María</h1>
            <p>Cuando María llegó a CogniBoost, estaba frustrada. Llevaba años "estudiando" inglés pero no podía mantener una conversación profesional.</p>
            <div class="quote">
              <p style="color: #ffffff; margin: 0;">"Los Class Labs cambiaron todo para mí. Practicar con otros hispanohablantes de mi nivel me quitó el miedo a hablar. En 4 meses pasé de A2 a B2 y conseguí una promoción en mi trabajo."</p>
              <p style="color: #4FD1C5; margin: 10px 0 0 0; font-style: normal; font-weight: bold;">— María G., Gerente de Marketing, Ciudad de México</p>
            </div>
            <p>El secreto de María fue simple: <strong>consistencia + práctica en vivo.</strong> Los cursos te dan la base, los Class Labs te dan la fluidez.</p>
            <p>Tú también puedes lograrlo. ¿Ya reservaste tu primera sesión en vivo?</p>
            <a href="${data.dashboardUrl || 'https://cogniboost.co/dashboard'}" class="cta">EXPLORAR CLASS LABS</a>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },
    // ===== EMAIL SEQUENCE: Onboarding Day 7 — Feature Highlight (Quiz + Labs) =====
    onboarding_day7_feature: {
      subject: '¿Ya descubriste esta función? La mayoría no la conoce',
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #33CBFB; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #FD335A; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .feature { background: #2a2a2a; padding: 20px; margin: 15px 0; border-left: 4px solid #33CBFB; }
          .feature h3 { color: #33CBFB; margin: 0 0 8px 0; }
          .feature p { margin: 0; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>¡Hola ${data.firstName || 'estudiante'}!</h1>
            <p>Ya llevas una semana con nosotros. Queremos asegurarnos de que estés sacando el máximo provecho. Aquí van dos funciones que muchos estudiantes no descubren al principio:</p>
            <div class="feature">
              <h3>Examen de Nivel Adaptativo</h3>
              <p>Nuestro quiz se adapta a tus respuestas en tiempo real. Te da tu nivel CEFR exacto (A1-C2) para que estudies exactamente lo que necesitas.</p>
            </div>
            <div class="feature">
              <h3>Class Labs por Nivel</h3>
              <p>No son clases normales. Son laboratorios de conversación donde practicas con otros estudiantes de TU nivel. Máx. 6 personas, temas reales, feedback inmediato.</p>
            </div>
            <p>¿Ya probaste ambas? Si no, esta semana es el momento perfecto.</p>
            <a href="${data.dashboardUrl || 'https://cogniboost.co/placement-quiz'}" class="cta">TOMAR MI EXAMEN DE NIVEL</a>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },
    // ===== EMAIL SEQUENCE: Trial Ending (Day 5 of 7-day trial) =====
    trial_ending: {
      subject: '⏰ Tu prueba gratuita termina en 2 días',
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #FD335A; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .countdown { background: linear-gradient(135deg, #FD335A 0%, #c4264a 100%); padding: 25px; text-align: center; margin: 20px 0; }
          .countdown h2 { color: #ffffff; margin: 0; font-size: 36px; }
          .countdown p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; }
          .benefit { background: #2a2a2a; padding: 15px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>${data.firstName || 'Estudiante'}, tu prueba está por terminar</h1>
            <div class="countdown">
              <h2>2 DÍAS</h2>
              <p>restantes en tu prueba del plan ${data.planName || 'Premium'}</p>
            </div>
            <p>En estos días has tenido acceso a todo lo que CogniBoost ofrece. Si continúas, no perderás nada de tu progreso.</p>
            <p><strong>Lo que mantienes con tu suscripción:</strong></p>
            <div class="benefit"><p style="margin: 0;">✓ Todo tu progreso y lecciones completadas</p></div>
            <div class="benefit"><p style="margin: 0;">✓ Acceso a Class Labs en vivo</p></div>
            <div class="benefit"><p style="margin: 0;">✓ Certificados de completación</p></div>
            <div class="benefit"><p style="margin: 0;">✓ Soporte prioritario</p></div>
            <p>Si no deseas continuar, puedes cancelar en cualquier momento desde tu dashboard. Sin compromisos.</p>
            <a href="${data.dashboardUrl || 'https://cogniboost.co/dashboard'}" class="cta">VER MI PROGRESO</a>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },
    // ===== EMAIL SEQUENCE: Trial Expired =====
    trial_expired: {
      subject: 'Tu prueba terminó — tu progreso sigue aquí',
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #33CBFB; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #FD335A; color: #ffffff; padding: 20px 40px; text-decoration: none; font-weight: bold; margin: 20px 0; font-size: 16px; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>Hola ${data.firstName || 'estudiante'}</h1>
            <p>Tu prueba gratuita del plan <strong>${data.planName || 'Premium'}</strong> ha finalizado.</p>
            <p>Pero queremos que sepas algo importante: <strong>todo tu progreso sigue guardado.</strong> Tus lecciones completadas, tu nivel y tus logros no desaparecen.</p>
            <p>Cuando estés listo para continuar, solo elige un plan y retoma exactamente donde lo dejaste.</p>
            <p style="text-align: center;">
              <a href="https://cogniboost.co/#pricing" class="cta">VER PLANES Y PRECIOS</a>
            </p>
            <p>¿Algo nos faltó? ¿Tienes dudas? Responde a este email — nos importa tu experiencia.</p>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },
    // ===== EMAIL SEQUENCE: Re-engagement (30 days inactive) =====
    reengagement: {
      subject: `${data.firstName || "Hola"}, te echamos de menos`,
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #33CBFB; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .whats-new { background: #2a2a2a; padding: 20px; margin: 20px 0; border-left: 4px solid #4FD1C5; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>¡Hola ${data.firstName || 'estudiante'}!</h1>
            <p>Hace un tiempo que no te vemos por CogniBoost y queríamos saber cómo estás.</p>
            <p>Entendemos que la vida se complica. Pero recuerda: incluso <strong>10 minutos al día</strong> hacen la diferencia.</p>
            <div class="whats-new">
              <p style="color: #4FD1C5; font-weight: bold; margin: 0 0 10px 0;">Mientras no estabas, agregamos:</p>
              <ul style="color: #cccccc; margin: 0; padding-left: 20px;">
                <li style="margin: 8px 0;">Nuevos Class Labs semanales con temas actuales</li>
                <li style="margin: 8px 0;">Más lecciones y quizzes interactivos</li>
                <li style="margin: 8px 0;">Mejoras en el seguimiento de progreso</li>
              </ul>
            </div>
            <p>Tu progreso sigue exactamente donde lo dejaste. Solo haz clic para retomar:</p>
            <a href="${data.dashboardUrl || 'https://cogniboost.co/dashboard'}" class="cta">VOLVER A MI DASHBOARD</a>
            <p>Si ya no quieres recibir estos emails, lo entendemos. Pero tu cuenta siempre estará aquí.</p>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },
    // ===== EMAIL SEQUENCE: Payment Failed =====
    payment_failed: {
      subject: 'Problema con tu pago — actualiza tu método de pago',
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #F6AD55; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #F6AD55; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .alert { background: #2a2a2a; padding: 20px; margin: 20px 0; border-left: 4px solid #F6AD55; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>Hola ${data.firstName || 'estudiante'}</h1>
            <p>No pudimos procesar tu pago para el plan <strong>${data.planName || 'Premium'}</strong>. Esto probablemente se debe a una tarjeta expirada o fondos insuficientes.</p>
            <div class="alert">
              <p style="color: #F6AD55; font-weight: bold; margin: 0 0 10px 0;">¿Qué significa esto?</p>
              <p style="margin: 0;">Tu acceso a cursos y Class Labs no se verá interrumpido de inmediato, pero necesitamos que actualices tu método de pago para evitar la suspensión de tu cuenta.</p>
            </div>
            <p>Solo toma un minuto actualizar tu información de pago:</p>
            <a href="${data.billingUrl || 'https://cogniboost.co/dashboard'}" class="cta">ACTUALIZAR MÉTODO DE PAGO</a>
            <p>Si tienes alguna duda sobre el cobro, responde a este email y te ayudamos.</p>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },
    // ===== EMAIL SEQUENCE: Weekly Progress Summary =====
    weekly_progress: {
      subject: `📊 Tu resumen semanal de inglés — ${data.lessonsCompleted || "0"} lecciones completadas`,
      html: `
        <!DOCTYPE html><html><head><style>
          body { font-family: 'Inter', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; padding: 40px; }
          .logo { font-family: Impact, 'Arial Black', sans-serif; font-size: 32px; color: #33CBFB; text-align: center; margin-bottom: 30px; }
          h1 { color: #33CBFB; margin: 0 0 20px 0; }
          p { line-height: 1.7; color: #cccccc; }
          .cta { display: inline-block; background: #33CBFB; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .stat { background: #2a2a2a; padding: 20px; text-align: center; }
          .stat-value { font-size: 28px; color: #33CBFB; font-weight: bold; }
          .stat-label { font-size: 12px; color: #888888; text-transform: uppercase; margin-top: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666666; font-size: 12px; }
        </style></head><body>
          <div class="container">
            <div class="logo">COGNIBOOST</div>
            <h1>Tu semana en CogniBoost</h1>
            <p>¡Hola ${data.firstName || 'estudiante'}! Aquí tienes tu resumen de la semana:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="background: #2a2a2a; padding: 20px; text-align: center; width: 50%;">
                  <div style="font-size: 28px; color: #33CBFB; font-weight: bold;">${data.lessonsCompleted || '0'}</div>
                  <div style="font-size: 12px; color: #888888; text-transform: uppercase; margin-top: 5px;">Lecciones</div>
                </td>
                <td style="background: #2a2a2a; padding: 20px; text-align: center; width: 50%;">
                  <div style="font-size: 28px; color: #4FD1C5; font-weight: bold;">${data.quizzesCompleted || '0'}</div>
                  <div style="font-size: 12px; color: #888888; text-transform: uppercase; margin-top: 5px;">Quizzes</div>
                </td>
              </tr>
              <tr>
                <td style="background: #2a2a2a; padding: 20px; text-align: center; width: 50%;">
                  <div style="font-size: 28px; color: #FD335A; font-weight: bold;">${data.labsAttended || '0'}</div>
                  <div style="font-size: 12px; color: #888888; text-transform: uppercase; margin-top: 5px;">Class Labs</div>
                </td>
                <td style="background: #2a2a2a; padding: 20px; text-align: center; width: 50%;">
                  <div style="font-size: 28px; color: #F6AD55; font-weight: bold;">${data.currentStreak || '0'}</div>
                  <div style="font-size: 12px; color: #888888; text-transform: uppercase; margin-top: 5px;">Días de racha</div>
                </td>
              </tr>
            </table>
            <p>${parseInt(data.lessonsCompleted || '0') > 0 ? '¡Excelente trabajo! Sigue así.' : 'Esta semana fue tranquila. ¡La próxima puede ser tu mejor semana!'}</p>
            <a href="${data.dashboardUrl || 'https://cogniboost.co/dashboard'}" class="cta">IR A MI DASHBOARD</a>
            <p><strong>— El equipo de CogniBoost</strong></p>
            <div class="footer"><p>© 2026 CogniBoost. Todos los derechos reservados.</p></div>
          </div>
        </body></html>
      `
    },

    // ===== ADMIN NOTIFICATION: New Subscription Purchase =====
    admin_subscription_notification: {
      subject: `🎉 Nueva suscripción: Plan ${data.planName || 'Nuevo'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', sans-serif; background-color: #f8f9fa; color: #1a1a40; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #667EEA; }
            .logo { font-family: 'Inter', sans-serif; font-size: 28px; font-weight: bold; color: #667EEA; }
            .badge { background: #48BB78; color: #ffffff; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-top: 10px; }
            h1 { color: #1a1a40; margin: 0; font-size: 22px; }
            p { line-height: 1.6; color: #4a4a4a; }
            .info-section { margin: 20px 0; }
            .info-section h3 { color: #667EEA; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
            .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; }
            .info-row { display: flex; margin: 10px 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px; }
            .info-row:last-child { border-bottom: none; padding-bottom: 0; }
            .info-label { color: #888888; width: 140px; font-size: 14px; }
            .info-value { color: #1a1a40; font-weight: 500; }
            .highlight { background: linear-gradient(135deg, #667EEA 0%, #48BB78 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .highlight h2 { color: #ffffff; margin: 0; font-size: 24px; }
            .highlight p { color: #ffffff; margin: 5px 0 0 0; }
            .footer { text-align: center; margin-top: 30px; color: #888888; font-size: 12px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">CogniBoost Admin</div>
              <div class="badge">NUEVA SUSCRIPCIÓN</div>
            </div>
            <h1>Se ha registrado una nueva suscripción</h1>

            <div class="highlight">
              <h2>PLAN ${(data.planName || 'NUEVO').toUpperCase()}</h2>
              <p>$${data.amount || '0'}/mes</p>
            </div>

            <div class="info-section">
              <h3>Información del Estudiante</h3>
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">${data.studentName || 'No proporcionado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${data.studentEmail || 'No proporcionado'}</span>
                </div>
              </div>
            </div>

            <div class="info-section">
              <h3>Detalles de la Suscripción</h3>
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Plan:</span>
                  <span class="info-value">${data.planName || 'No especificado'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Nivel de acceso:</span>
                  <span class="info-value">${data.tier || 'basic'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Prueba gratuita:</span>
                  <span class="info-value">7 días</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Monto mensual:</span>
                  <span class="info-value">$${data.amount || '0'} USD</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fecha:</span>
                  <span class="info-value">${data.timestamp || new Date().toLocaleString('es-ES')}</span>
                </div>
              </div>
            </div>

            <p style="text-align: center;">
              <a href="${data.adminUrl || 'https://cogniboost.co/admin/financials'}" style="display: inline-block; background: #667EEA; color: #ffffff; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 6px;">VER EN DASHBOARD</a>
            </p>

            <div class="footer">
              <p>Este es un correo automático del sistema CogniBoost</p>
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
