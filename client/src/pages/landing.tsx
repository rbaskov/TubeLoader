import { useState } from "react";
import { Download, Music, Video, Clock, Server, MessageCircle, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { AuthForm } from "@/components/auth-form";
import { queryClient } from "@/lib/queryClient";

export default function Landing() {
  const { t } = useApp();
  const [showAuth, setShowAuth] = useState(false);

  const features = [
    { icon: Video, text: t.landing.features.download },
    { icon: Music, text: t.landing.features.audio },
    { icon: Video, text: t.landing.features.quality },
    { icon: Clock, text: t.landing.features.background },
    { icon: Server, text: t.landing.features.sync },
    { icon: MessageCircle, text: t.landing.features.telegram },
    { icon: Tv, text: t.landing.features.jellyfin },
  ];

  const handleAuthSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Download className="h-4 w-4" />
            </div>
            <span className="font-semibold">YT Downloader</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <Button 
              onClick={() => setShowAuth(true)}
              data-testid="button-login"
            >
              {t.nav.login}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-14">
        {showAuth ? (
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
            <div className="container relative px-4 py-16 md:py-24">
              <div className="mx-auto flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  className="mb-6 self-start"
                  onClick={() => setShowAuth(false)}
                  data-testid="button-back-to-landing"
                >
                  {t.common.back}
                </Button>
                <AuthForm onSuccess={handleAuthSuccess} />
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
              <div className="container relative px-4 py-24 md:py-32">
                <div className="mx-auto max-w-2xl text-center">
                  <h1 
                    className="text-3xl font-bold tracking-tight md:text-5xl"
                    data-testid="text-landing-title"
                  >
                    {t.landing.title}
                  </h1>
                  <p 
                    className="mt-4 text-lg text-muted-foreground md:text-xl"
                    data-testid="text-landing-subtitle"
                  >
                    {t.landing.subtitle}
                  </p>
                  <div className="mt-8">
                    <Button 
                      size="lg" 
                      onClick={() => setShowAuth(true)}
                      data-testid="button-get-started"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t.landing.getStarted}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t bg-muted/30">
              <div className="container px-4 py-16 md:py-24">
                <h2 
                  className="mb-12 text-center text-2xl font-semibold md:text-3xl"
                  data-testid="text-features-title"
                >
                  {t.landing.features.title}
                </h2>
                <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
                  {features.map((feature, index) => (
                    <Card 
                      key={index} 
                      className="flex items-center gap-4 p-4"
                      data-testid={`card-feature-${index}`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t py-6">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>YouTube Downloader</p>
        </div>
      </footer>
    </div>
  );
}
