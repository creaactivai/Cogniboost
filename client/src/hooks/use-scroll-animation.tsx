import { useEffect, useRef, useState } from "react";

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = "0px", triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-left" | "fade-right" | "fade-in" | "scale-up";
  delay?: number;
}

export function AnimatedSection({ 
  children, 
  className = "", 
  animation = "fade-up",
  delay = 0 
}: AnimatedSectionProps) {
  const { ref, isVisible } = useScrollAnimation();

  const animationClasses: Record<string, string> = {
    "fade-up": "translate-y-12 opacity-0",
    "fade-left": "-translate-x-12 opacity-0",
    "fade-right": "translate-x-12 opacity-0",
    "fade-in": "opacity-0",
    "scale-up": "scale-95 opacity-0",
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className} ${
        isVisible ? "translate-y-0 translate-x-0 opacity-100 scale-100" : animationClasses[animation]
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
