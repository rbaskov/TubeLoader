import { Link } from "wouter";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";

export default function NotFound() {
  const { t } = useApp();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Page not found
      </p>
      <Button asChild data-testid="link-back-home">
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          {t.common.back}
        </Link>
      </Button>
    </div>
  );
}
