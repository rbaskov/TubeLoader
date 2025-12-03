import { useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { JobCard } from "@/components/job-card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { DownloadJob } from "@shared/schema";

export default function Jobs() {
  const { t } = useApp();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t.errors.unauthorized,
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast, t.errors.unauthorized]);

  const { data: jobs, isLoading } = useQuery<DownloadJob[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
    refetchInterval: 3000,
  });

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 
          className="text-2xl font-semibold mb-6"
          data-testid="text-page-title"
        >
          {t.jobs.title}
        </h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-2">{t.jobs.noJobs}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t.jobs.noJobsDescription}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
