import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/Frame_2_1768763364518.png";

const credentials = [
  "Licenciatura en Psicología",
  "Maestría en Intervención de Dificultades de Aprendizaje y Trastornos del Lenguaje",
  "SAT Certified Coordinator",
  "Certificación AP Classes (Advanced Placement)",
  "Especialista en Adaptación Curricular",
  "10+ años en educación y psicología educativa",
];

const teamExpertise = [
  "Tutoría personalizada y enseñanza individual",
  "Diseño curricular y adaptación educativa",
  "Psicología educativa y neurociencia del aprendizaje",
  "Coordinación de programas académicos avanzados (SAT, AP)",
  "Intervención en dificultades de aprendizaje",
  "Desarrollo profesional y formación corporativa",
];

const values = [
  { title: "Excelencia Pedagógica", description: "Cada curso está diseñado por expertos con credenciales académicas y experiencia práctica real." },
  { title: "Resultados Medibles", description: "No vendemos certificados—entregamos habilidades que se traducen en avance profesional real." },
  { title: "Accesibilidad Real", description: "Educación de clase mundial en español nativo, diseñada para profesionales hispanohablantes." },
  { title: "Innovación Continua", description: "Constantemente evolucionamos nuestra metodología basándonos en investigación y feedback de estudiantes." },
  { title: "Comunidad sobre Competencia", description: "Creemos en el aprendizaje colaborativo donde todos elevamos juntos." },
  { title: "Transparencia Total", description: "Compartimos nuestros resultados, metodología y compromisos sin filtros." },
];

const stats = [
  { number: "87%", label: "Avance profesional en 6 meses" },
  { number: "75%+", label: "Tasa de finalización de cursos" },
  { number: "10+", label: "Años de experiencia educativa" },
];

export default function SobreNosotros() {
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
        <div className="bg-gradient-to-br from-[#1A1A40] to-primary py-20 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-title">Sobre Nosotros</h1>
          <p className="text-xl text-[hsl(174_58%_56%)] italic">Eleva Tu Potencial</p>
        </div>

        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <section className="bg-card rounded p-8 md:p-12 shadow-sm mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3" data-testid="text-history">Nuestra Historia</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CogniBoost nace de una década de dedicación a transformar vidas a través de la educación. Lo que comenzó como CogniMight Academy—una innovadora escuela de inglés para niños—evolucionó hacia algo más grande: una plataforma de aprendizaje profesional que democratiza el acceso al conocimiento de clase mundial para adultos hispanohablantes.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              En CogniMight Academy, desarrollamos y perfeccionamos una metodología revolucionaria que cambió la forma en que las personas aprenden. Ahora, llevamos esa misma innovación pedagógica al mundo del desarrollo profesional, ayudando a miles de profesionales a avanzar en sus carreras a través de educación práctica, relevante y orientada a resultados.
            </p>
            <div className="bg-primary/10 border-l-4 border-primary p-6 rounded">
              <p className="text-foreground font-medium">
                Somos la única academia implementando la novedosa metodología Class Labs, diseñada específicamente para maximizar la retención, aplicación y éxito profesional de nuestros estudiantes.
              </p>
            </div>
          </section>

          <section className="bg-card rounded p-8 md:p-12 shadow-sm mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3">Nuestra Fundadora</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-primary to-[hsl(174_58%_56%)] rounded aspect-square flex items-center justify-center text-6xl font-bold text-white">
                CL
              </div>
              <div className="md:col-span-2">
                <h3 className="text-2xl font-bold text-primary mb-2">Lic. Coral Lozano</h3>
                <p className="text-primary font-semibold mb-4">Fundadora y Directora Académica • Creadora de la Metodología Class Labs</p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  La Lic. Coral Lozano es una psicóloga educativa con más de 10 años de experiencia transformando la manera en que las personas aprenden. Con una Maestría en Intervención de Dificultades de Aprendizaje y Trastornos del Lenguaje en Ambientes Educativos, Coral ha dedicado su carrera a entender las complejidades del aprendizaje humano y diseñar soluciones innovadoras que realmente funcionan.
                </p>
                <div className="bg-muted p-4 rounded mb-4">
                  <ul className="space-y-2">
                    {credentials.map((cred, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[hsl(174_58%_56%)] flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{cred}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Esta experiencia la llevó a desarrollar la <strong className="text-foreground">Metodología Class Labs</strong>, un enfoque revolucionario que combina neurociencia cognitiva, psicología educativa y aprendizaje basado en proyectos para crear experiencias de aprendizaje que no solo transmiten conocimiento, sino que transforman capacidades profesionales.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-card rounded p-8 md:p-12 shadow-sm mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3">La Metodología Class Labs</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Nuestra metodología patentada es el resultado de años de investigación, experimentación y refinamiento en entornos educativos reales. Desarrollada y perfeccionada por la Lic. Coral Lozano, Class Labs fue puesta a prueba con miles de estudiantes en CogniMight Academy antes de ser adaptada para el aprendizaje profesional adulto.
            </p>
            <div className="bg-gradient-to-br from-[#1A1A40] to-primary p-8 rounded text-white mb-6">
              <h3 className="text-2xl font-bold text-[hsl(174_58%_56%)] mb-4">¿Qué hace única a Class Labs?</h3>
              <div className="space-y-3">
                <p><strong>1. Aprendizaje Activo Estructurado:</strong> No escuchas pasivamente—experimentas, construyes y aplicas desde el primer día.</p>
                <p><strong>2. Neurociencia Aplicada:</strong> Cada lección está diseñada según cómo el cerebro adulto realmente aprende y retiene información nueva.</p>
                <p><strong>3. Adaptación Curricular Personalizada:</strong> El mismo principio que usamos para estudiantes con necesidades especiales ahora acelera el aprendizaje de profesionales.</p>
                <p><strong>4. Proyectos del Mundo Real:</strong> No ejercicios teóricos—problemas reales que enfrentarás en tu trabajo del lunes.</p>
                <p><strong>5. Responsabilidad Comunitaria:</strong> Pods de aprendizaje entre pares que mantienen motivación y compromiso.</p>
              </div>
            </div>
            <h3 className="text-xl font-bold text-primary mb-3">Comprobada en el Campo de Batalla Educativo</h3>
            <p className="text-muted-foreground leading-relaxed">
              Antes de lanzar CogniBoost, probamos Class Labs durante años en CogniMight Academy. Los resultados fueron extraordinarios: tasas de finalización del 85%+ (vs. 5-10% de cursos tradicionales), retención de conocimiento medida en 90%+, y lo más importante—aplicación real de habilidades en contextos profesionales.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Hoy, CogniBoost es la <strong className="text-foreground">única academia implementando esta metodología innovadora</strong> en el mercado de educación profesional para adultos hispanohablantes.
            </p>
          </section>

          <section className="bg-card rounded p-8 md:p-12 shadow-sm mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3">Nuestro Impacto</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="bg-muted p-6 rounded text-center">
                  <div className="text-4xl font-bold text-primary mb-2">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card rounded p-8 md:p-12 shadow-sm mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3">Nuestros Valores</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value, i) => (
                <div key={i} className="bg-muted p-6 rounded border-l-4 border-[hsl(174_58%_56%)]">
                  <h4 className="font-bold mb-2">{value.title}</h4>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card rounded p-8 md:p-12 shadow-sm mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3">Nuestra Misión</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Democratizar el acceso al conocimiento profesional de clase mundial para la comunidad hispanohablante, eliminando las barreras de idioma, costo y formato que han limitado el crecimiento profesional de millones de personas talentosas.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Creemos que cada profesional merece la oportunidad de alcanzar su máximo potencial, sin importar dónde viva, qué universidad haya asistido, o cuánto dinero tenga en el banco. Por eso creamos CogniBoost: para ser el puente entre donde estás hoy y donde quieres estar mañana.
            </p>
            <div className="bg-primary/10 border-l-4 border-primary p-6 rounded">
              <p className="text-foreground font-medium">
                No somos una plataforma de cursos más. Somos tu socio en crecimiento profesional, respaldados por metodología científicamente probada, instrucción de expertos, y una comunidad que te impulsa hacia adelante.
              </p>
            </div>
          </section>

          <section className="bg-card rounded p-8 md:p-12 shadow-sm mb-10">
            <h2 className="text-3xl font-bold mb-6 text-foreground border-b-4 border-primary pb-3">Nuestro Equipo</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Detrás de CogniBoost hay un equipo de educadores, diseñadores instruccionales, tecnólogos y especialistas en desarrollo profesional—todos unidos por la pasión de transformar carreras a través de educación excepcional.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nuestra dirección académica tiene décadas de experiencia combinada en:
            </p>
            <div className="bg-muted p-4 rounded mb-4">
              <ul className="space-y-2">
                {teamExpertise.map((exp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[hsl(174_58%_56%)] flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{exp}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Cada miembro de nuestro equipo comparte el compromiso de la Lic. Coral Lozano con la excelencia educativa y el impacto medible en la vida de nuestros estudiantes.
            </p>
          </section>

          <section className="bg-gradient-to-br from-muted to-[hsl(174_58%_56%/0.1)] rounded p-8 md:p-12 shadow-sm text-center">
            <h2 className="text-3xl font-bold mb-4">Únete a Nosotros</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Miles de profesionales ya están elevando sus carreras con CogniBoost.<br />
              Es tu turno de dar el siguiente paso.
            </p>
            <a href="/#pricing">
              <Button size="lg" data-testid="button-explore-courses">Explorar Cursos</Button>
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
