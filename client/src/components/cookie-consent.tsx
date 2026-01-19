import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X, Cookie, ChevronDown, ChevronUp } from "lucide-react";

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = "cb_cookie_consent";

const defaultPreferences: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      setIsVisible(true);
    } else {
      try {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      } catch {
        setIsVisible(true);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setIsVisible(false);
  };

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    savePreferences(allAccepted);
  };

  const acceptSelected = () => {
    savePreferences(preferences);
  };

  const rejectNonEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
    };
    setPreferences(essentialOnly);
    savePreferences(essentialOnly);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <Card className="max-w-2xl mx-auto p-6 shadow-lg border-border bg-card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
              <Cookie className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground" data-testid="text-cookie-title">Preferencias de Cookies</h3>
              <p className="text-sm text-muted-foreground">Configuramos cookies en tu dispositivo</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={rejectNonEssential}
            aria-label="Cerrar"
            data-testid="button-cookie-close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Usamos cookies para mejorar tu experiencia, analizar el tráfico del sitio y personalizar contenido. 
          Puedes aceptar todas las cookies o gestionar tus preferencias.{" "}
          <a href="/legal#cookies" className="text-primary hover:underline" data-testid="link-cookie-policy">
            Más información
          </a>
        </p>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-primary mb-4 hover:underline"
          data-testid="button-cookie-details"
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar detalles
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver detalles de cookies
            </>
          )}
        </button>

        {showDetails && (
          <div className="space-y-4 mb-6 p-4 bg-muted rounded">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cookies esenciales</p>
                <p className="text-xs text-muted-foreground">Necesarias para el funcionamiento del sitio</p>
              </div>
              <Switch
                checked={preferences.essential}
                disabled
                data-testid="switch-cookie-essential"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cookies funcionales</p>
                <p className="text-xs text-muted-foreground">Recordar preferencias y configuraciones</p>
              </div>
              <Switch
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, functional: checked })
                }
                data-testid="switch-cookie-functional"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cookies analíticas</p>
                <p className="text-xs text-muted-foreground">Medir y mejorar el rendimiento del sitio</p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
                data-testid="switch-cookie-analytics"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Cookies de marketing</p>
                <p className="text-xs text-muted-foreground">Mostrar anuncios relevantes</p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, marketing: checked })
                }
                data-testid="switch-cookie-marketing"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={rejectNonEssential}
            data-testid="button-cookie-reject"
          >
            Solo esenciales
          </Button>
          {showDetails && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={acceptSelected}
              data-testid="button-cookie-save"
            >
              Guardar selección
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={acceptAll}
            data-testid="button-cookie-accept"
          >
            Aceptar todas
          </Button>
        </div>
      </Card>
    </div>
  );
}
