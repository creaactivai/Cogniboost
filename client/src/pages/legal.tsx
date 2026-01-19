import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/Frame_2_1768763364518.png";

export default function Legal() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center" data-testid="link-logo">
              <img src={logoImage} alt="CogniBoost" className="h-8 w-auto" />
            </a>
            <a href="/">
              <Button variant="ghost">Volver al Inicio</Button>
            </a>
          </div>
        </div>
      </header>

      <div className="pt-16">
        <div className="bg-[#1A1A40] py-12 text-center text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-title">Documentos Legales</h1>
          <p className="text-white/80">CogniBoost</p>
        </div>

        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <nav className="bg-card rounded p-4 mb-8 shadow-sm sticky top-20 z-40">
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="#privacidad" className="text-sm text-primary hover:underline" data-testid="link-privacy">Política de Privacidad</a>
              <a href="#terminos" className="text-sm text-primary hover:underline" data-testid="link-terms">Términos de Servicio</a>
              <a href="#cookies" className="text-sm text-primary hover:underline" data-testid="link-cookies">Política de Cookies</a>
            </div>
          </nav>

          <div className="text-center text-sm text-muted-foreground mb-8 bg-muted p-4 rounded">
            <strong>Fecha de entrada en vigor:</strong> 1 de febrero de 2026<br />
            <strong>Última actualización:</strong> 18 de enero de 2026
          </div>

          <section id="privacidad" className="scroll-mt-32 mb-16">
            <div className="bg-card rounded p-8 md:p-10 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3" data-testid="text-privacy-title">Política de Privacidad</h2>
              
              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">1. Introducción</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Bienvenido a CogniBoost ("nosotros", "nuestro" o "la Compañía"). CogniBoost, operada por CogniBoost LLC, está comprometida con la protección de su privacidad y el manejo responsable de su información personal.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Esta Política de Privacidad describe cómo recopilamos, usamos, compartimos y protegemos su información cuando utiliza nuestro sitio web <strong className="text-foreground">cogniboost.co</strong> (el "Sitio") y nuestros servicios de educación profesional en línea (los "Servicios").
              </p>
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded mb-4">
                <p className="text-foreground font-medium">
                  Al usar nuestros Servicios, usted acepta las prácticas descritas en esta Política de Privacidad. Si no está de acuerdo con nuestras políticas y prácticas, no utilice nuestros Servicios.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">2. Información que Recopilamos</h3>
              <h4 className="font-semibold mt-4 mb-2">2.1 Información que Usted Proporciona Directamente</h4>
              <p className="text-muted-foreground leading-relaxed mb-2">Recopilamos información que usted nos proporciona voluntariamente cuando:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li><strong>Crea una cuenta:</strong> Nombre, dirección de correo electrónico, contraseña, país de residencia, zona horaria</li>
                <li><strong>Se inscribe en un curso:</strong> Información de facturación, método de pago, historial educativo, objetivos profesionales</li>
                <li><strong>Completa su perfil:</strong> Foto de perfil, biografía, experiencia profesional, habilidades, intereses</li>
                <li><strong>Participa en cursos:</strong> Tareas completadas, proyectos, interacciones en foros, respuestas a evaluaciones</li>
                <li><strong>Se comunica con nosotros:</strong> Mensajes, correos electrónicos, tickets de soporte, encuestas de satisfacción</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">2.2 Información Recopilada Automáticamente</h4>
              <p className="text-muted-foreground leading-relaxed mb-2">Cuando utiliza nuestros Servicios, recopilamos automáticamente:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li><strong>Información del dispositivo:</strong> Tipo de dispositivo, sistema operativo, navegador, dirección IP</li>
                <li><strong>Datos de uso:</strong> Páginas visitadas, tiempo en el sitio, clics, cursos vistos, progreso de lecciones</li>
                <li><strong>Datos de rendimiento:</strong> Calificaciones de evaluaciones, tiempo para completar lecciones, tasas de finalización</li>
                <li><strong>Información de ubicación:</strong> Ubicación general basada en dirección IP (país, ciudad)</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">3. Cómo Usamos su Información</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">Utilizamos la información recopilada para:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li>Crear y administrar su cuenta</li>
                <li>Proporcionar acceso a cursos y materiales educativos</li>
                <li>Procesar inscripciones y pagos</li>
                <li>Personalizar su experiencia de aprendizaje</li>
                <li>Enviar notificaciones sobre su cuenta y cursos</li>
                <li>Proteger contra fraude y actividades maliciosas</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">4. Cómo Compartimos su Información</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">Compartimos su información con:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li><strong>Proveedores de servicios:</strong> Procesamiento de pagos (Stripe), servicios de email, analytics</li>
                <li><strong>Instructores y otros estudiantes:</strong> Su nombre y foto de perfil son visibles en salas temáticas</li>
                <li><strong>Para propósitos legales:</strong> Cuando sea requerido por ley</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">5. Sus Derechos de Privacidad</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">Dependiendo de su ubicación, puede tener derecho a:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li><strong>Acceso:</strong> Solicitar una copia de su información personal</li>
                <li><strong>Corrección:</strong> Solicitar corrección de información inexacta</li>
                <li><strong>Eliminación:</strong> Solicitar eliminación de su información ("derecho al olvido")</li>
                <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Para ejercer estos derechos, contacte a <strong className="text-foreground">privacy@cogniboost.co</strong>
              </p>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">6. Seguridad de la Información</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Implementamos medidas de seguridad técnicas y organizativas para proteger su información, incluyendo cifrado SSL/TLS, control de acceso basado en roles, y monitoreo 24/7.
              </p>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">7. Contacto</h3>
              <div className="bg-gradient-to-br from-[#1A1A40] to-primary p-6 rounded text-white">
                <h4 className="text-[hsl(174_58%_56%)] font-semibold mb-2">CogniBoost LLC</h4>
                <p className="text-white/90">Email: <a href="mailto:privacy@cogniboost.co" className="text-[hsl(174_58%_56%)]">privacy@cogniboost.co</a></p>
                <p className="text-white/90">Sitio web: cogniboost.co</p>
              </div>
            </div>
          </section>

          <section id="terminos" className="scroll-mt-32 mb-16">
            <div className="bg-card rounded p-8 md:p-10 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3" data-testid="text-terms-title">Términos de Servicio</h2>

              <div className="bg-orange-100 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded mb-6">
                <p className="text-foreground font-medium">
                  IMPORTANTE: LEA ESTOS TÉRMINOS CUIDADOSAMENTE ANTES DE USAR NUESTROS SERVICIOS.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">1. Aceptación de los Términos</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Estos Términos de Servicio ("Términos") constituyen un acuerdo legal vinculante entre usted y CogniBoost LLC ("CogniBoost", "nosotros", "nuestro"), una compañía constituida bajo las leyes del Estado de Texas, Estados Unidos.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Al acceder o usar nuestros Servicios, usted acepta estar legalmente vinculado por estos Términos.</strong>
              </p>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">2. Elegibilidad y Requisitos de Cuenta</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">Al usar nuestros Servicios, usted declara que:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li>Tiene al menos 18 años de edad o tiene el consentimiento de un padre/tutor</li>
                <li>Tiene la capacidad legal para celebrar un contrato vinculante</li>
                <li>Proporcionará información precisa y actualizada</li>
                <li>Mantendrá la seguridad de su contraseña y cuenta</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">3. Descripción de los Servicios</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">CogniBoost proporciona:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li>Cursos en vivo y pregrabados sobre desarrollo profesional</li>
                <li>Aprendizaje basado en salas temáticas con inicio de clases programado</li>
                <li>Acceso a instructores expertos y sesiones de Q&A en vivo</li>
                <li>Certificados de finalización para cursos completados</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">4. Pagos, Facturación y Reembolsos</h3>
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded mb-4">
                <p className="text-foreground font-medium">
                  Período de Garantía de 7 Días: Ofrecemos un reembolso completo si solicita la cancelación dentro de los primeros 7 días calendario desde la fecha de inscripción Y antes de que haya transcurrido más del 20% del curso.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-2">Condiciones para reembolsos:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li><strong>Dentro de 7 días + menos del 20% completado:</strong> Reembolso completo (100%)</li>
                <li><strong>Después de 7 días O más del 20% completado:</strong> No hay reembolso</li>
                <li><strong>Cancelación del curso por CogniBoost:</strong> Reembolso completo o transferencia</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">5. Propiedad Intelectual</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Los Servicios y todo su contenido son propiedad de CogniBoost LLC y están protegidos por leyes de derechos de autor. Las marcas CogniBoost, Class Labs, y el logo son marcas registradas.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-2">Esta licencia NO le otorga el derecho de:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li>Copiar, distribuir o modificar el contenido</li>
                <li>Usar el contenido con fines comerciales</li>
                <li>Compartir su acceso al curso con otros</li>
                <li>Grabar o distribuir sesiones en vivo sin permiso</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">6. Conducta del Usuario</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">Usted acepta NO:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li>Usar los Servicios para cualquier propósito ilegal</li>
                <li>Acosar, abusar o intimidar a otros usuarios</li>
                <li>Publicar contenido ofensivo o difamatorio</li>
                <li>Hacer trampa o violar la integridad académica</li>
              </ul>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">7. Descargos de Responsabilidad</h3>
              <div className="bg-orange-100 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded mb-4">
                <p className="text-foreground font-medium">
                  LOS SERVICIOS SE PROPORCIONAN "TAL CUAL" SIN GARANTÍAS DE NINGÚN TIPO. No garantizamos resultados profesionales específicos.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">8. Contacto</h3>
              <p className="text-muted-foreground leading-relaxed">
                Para preguntas sobre estos términos: <strong className="text-foreground">legal@cogniboost.co</strong>
              </p>
            </div>
          </section>

          <section id="cookies" className="scroll-mt-32 mb-16">
            <div className="bg-card rounded p-8 md:p-10 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3" data-testid="text-cookies-title">Política de Cookies</h2>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">1. ¿Qué Son las Cookies?</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Las cookies son pequeños archivos de texto que se colocan en su computadora o dispositivo móvil cuando visita un sitio web. Son ampliamente utilizadas para hacer que los sitios web funcionen de manera más eficiente, así como para proporcionar información a los propietarios del sitio.
              </p>
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded mb-4">
                <p className="text-foreground font-medium">
                  Al continuar navegando y usando nuestro Sitio, usted acepta que podemos colocar estos tipos de cookies en su dispositivo. Sin embargo, puede controlar y/o eliminar las cookies según lo desee.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">2. Tipos de Cookies que Utilizamos</h3>
              
              <div className="bg-[hsl(174_58%_56%)] text-[#1A1A40] p-4 rounded mb-4">
                <h4 className="font-bold mb-2">ESTRICTAMENTE NECESARIAS</h4>
                <p className="text-sm">
                  Esenciales para navegar por el Sitio y utilizar sus funciones. Sin estas cookies, los servicios como acceso a su cuenta no se pueden proporcionar. No podemos desactivar estas cookies.
                </p>
              </div>

              <div className="bg-primary text-white p-4 rounded mb-4">
                <h4 className="font-bold mb-2">FUNCIONALES</h4>
                <p className="text-sm">
                  Permiten que el Sitio recuerde sus elecciones (idioma, región, preferencias) y proporcionan características mejoradas y personales. Puede aceptar o rechazar estas cookies.
                </p>
              </div>

              <div className="bg-orange-500 text-[#1A1A40] p-4 rounded mb-4">
                <h4 className="font-bold mb-2">ANALÍTICAS / DE RENDIMIENTO</h4>
                <p className="text-sm">
                  Nos permiten contar visitas y fuentes de tráfico para medir y mejorar el rendimiento del Sitio. Nos ayudan a saber qué páginas son las más y menos populares.
                </p>
              </div>

              <div className="bg-red-400 text-white p-4 rounded mb-4">
                <h4 className="font-bold mb-2">PUBLICIDAD / MARKETING</h4>
                <p className="text-sm">
                  Pueden ser utilizadas por nuestros socios publicitarios para construir un perfil de sus intereses y mostrarle anuncios relevantes en otros sitios.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">3. Cookies Específicas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left font-semibold">Nombre</th>
                      <th className="p-3 text-left font-semibold">Tipo</th>
                      <th className="p-3 text-left font-semibold">Propósito</th>
                      <th className="p-3 text-left font-semibold">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium">cb_session</td>
                      <td className="p-3">Esencial</td>
                      <td className="p-3">Mantiene su sesión activa</td>
                      <td className="p-3">Sesión</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium">cb_auth</td>
                      <td className="p-3">Esencial</td>
                      <td className="p-3">Autenticación segura</td>
                      <td className="p-3">7 días</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium">cb_consent</td>
                      <td className="p-3">Esencial</td>
                      <td className="p-3">Preferencias de cookies</td>
                      <td className="p-3">1 año</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium">cb_language</td>
                      <td className="p-3">Funcional</td>
                      <td className="p-3">Preferencia de idioma</td>
                      <td className="p-3">1 año</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-3 font-medium">cb_video_progress</td>
                      <td className="p-3">Funcional</td>
                      <td className="p-3">Progreso en videos</td>
                      <td className="p-3">90 días</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">4. Cómo Controlar las Cookies</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">Puede controlar las cookies de las siguientes maneras:</p>
              <ul className="list-disc ml-6 text-muted-foreground space-y-1 mb-4">
                <li><strong>Configuración del navegador:</strong> La mayoría de navegadores permiten bloquear o eliminar cookies</li>
                <li><strong>Banner de consentimiento:</strong> Use nuestro banner para aceptar o rechazar cookies no esenciales</li>
                <li><strong>Opt-out de publicidad:</strong> Visite www.aboutads.info/choices o www.youronlinechoices.eu</li>
              </ul>
              <div className="bg-orange-100 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded mb-4">
                <p className="text-foreground font-medium">
                  Nota: Bloquear cookies esenciales puede afectar la funcionalidad del Sitio.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary mt-6 mb-3">5. Contacto</h3>
              <p className="text-muted-foreground leading-relaxed">
                Para preguntas sobre esta política: <strong className="text-foreground">privacy@cogniboost.co</strong>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
