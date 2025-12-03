import { formatDistanceToNow } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { 
  Clock, 
  Download, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Upload,
  FileAudio,
  FileVideo,
  Trash2,
  RefreshCw,
  X,
  HardDrive,
  Check,
  Gauge
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import type { DownloadJob, UserSettings } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { jobProgressInfo } from "@/hooks/useWebSocket";

interface JobCardProps {
  job: DownloadJob;
  compact?: boolean;
}

export function JobCard({ job, compact = false }: JobCardProps) {
  const { t, language } = useApp();
  const { toast } = useToast();
  const locale = language === "ru" ? ru : enUS;

  // Get user settings to check autoUploadToNas
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const autoUploadEnabled = settings?.autoUploadToNas === 1 || settings?.autoUploadToNas === null;
  const nasConfigured = !!settings?.synologyEndpoint;
  
  // Get speed and ETA from WebSocket updates
  const progressInfo = jobProgressInfo.get(job.id);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/jobs/${job.id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t.errors.unauthorized,
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t.common.error,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/jobs/${job.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t.errors.unauthorized,
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t.common.error,
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/jobs/${job.id}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t.errors.unauthorized,
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t.common.error,
        variant: "destructive",
      });
    },
  });

  const handleDownload = () => {
    window.open(`/api/jobs/${job.id}/download`, '_blank');
  };

  const uploadToNasMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/jobs/${job.id}/upload-to-nas`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: t.jobs.uploadSuccess,
        description: data.filename,
      });
    },
    onError: async (error: any) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t.errors.unauthorized,
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      let errorMessage = t.jobs.uploadFailed;
      try {
        if (error.response) {
          const data = await error.response.json();
          errorMessage = data.message || errorMessage;
        }
      } catch {
        // Ignore parse errors
      }
      
      toast({
        title: t.jobs.uploadFailed,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = () => {
    switch (job.status) {
      case "queued":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "downloading":
        return <Download className="h-4 w-4 text-blue-500" />;
      case "converting":
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      case "uploading":
        return <Upload className="h-4 w-4 text-purple-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (job.status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "queued":
        return "outline";
      default:
        return "secondary";
    }
  };

  const statusText = t.jobs.status[job.status as keyof typeof t.jobs.status] || job.status;

  const isActive = ["downloading", "converting", "uploading", "queued"].includes(job.status);
  const canCancel = isActive;
  const canRetry = job.status === "failed";
  const canDelete = job.status === "completed" || job.status === "failed";
  const canDownload = job.status === "completed";
  const canSendToNas = job.status === "completed" && nasConfigured && !autoUploadEnabled && job.uploadedToNas !== 1;
  const isUploadedToNas = job.uploadedToNas === 1;

  const timeAgo = job.createdAt 
    ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true, locale })
    : "";

  if (compact) {
    return (
      <div 
        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
        data-testid={`job-card-compact-${job.id}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {job.format === "audio" ? (
            <FileAudio className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <FileVideo className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate text-sm" data-testid={`text-job-title-${job.id}`}>
            {job.videoTitle || job.youtubeUrl}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {job.progress || 0}%
            </span>
          )}
          {getStatusIcon()}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4" data-testid={`job-card-${job.id}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {job.videoThumbnail ? (
              <img 
                src={job.videoThumbnail} 
                alt="" 
                className="w-24 h-14 rounded object-cover shrink-0"
              />
            ) : (
              <div className="w-24 h-14 rounded bg-muted flex items-center justify-center shrink-0">
                {job.format === "audio" ? (
                  <FileAudio className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <FileVideo className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            )}
            <div className="flex flex-col min-w-0 gap-1">
              <span 
                className="font-medium text-sm truncate" 
                data-testid={`text-job-title-${job.id}`}
                title={job.videoTitle || job.youtubeUrl}
              >
                {job.videoTitle || job.youtubeUrl}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getStatusBadgeVariant()} className="text-xs">
                  <span className="flex items-center gap-1">
                    {getStatusIcon()}
                    {statusText}
                  </span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {job.format === "audio" ? "MP3" : `MP4 ${job.quality || ""}`}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
        </div>

        {isActive && (
          <div className="space-y-1">
            <Progress value={job.progress || 0} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t.jobs.progress}: {job.progress || 0}%
              </span>
              {progressInfo?.speed && (
                <span className="flex items-center gap-1">
                  <Gauge className="h-3 w-3" />
                  {progressInfo.speed}
                  {progressInfo.eta && ` (${progressInfo.eta})`}
                </span>
              )}
            </div>
          </div>
        )}

        {job.errorMessage && (
          <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            {job.errorMessage}
          </p>
        )}

        <div className="flex items-center gap-2 justify-end flex-wrap">
          {canDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              data-testid={`button-download-job-${job.id}`}
            >
              <Download className="h-4 w-4 mr-1" />
              {t.jobs.download}
            </Button>
          )}
          {canSendToNas && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => uploadToNasMutation.mutate()}
              disabled={uploadToNasMutation.isPending}
              data-testid={`button-upload-nas-${job.id}`}
            >
              <HardDrive className="h-4 w-4 mr-1" />
              {t.jobs.sendToNas}
            </Button>
          )}
          {job.status === "uploading" && (
            <Badge variant="secondary" className="text-xs">
              <Upload className="h-3 w-3 mr-1 animate-pulse" />
              {t.jobs.uploading} {job.progress || 0}%
            </Badge>
          )}
          {isUploadedToNas && job.status === "completed" && (
            <Badge variant="secondary" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              {t.jobs.uploadedToNas}
            </Badge>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid={`button-cancel-job-${job.id}`}
            >
              <X className="h-4 w-4 mr-1" />
              {t.jobs.cancel}
            </Button>
          )}
          {canRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              data-testid={`button-retry-job-${job.id}`}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t.jobs.retry}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-job-${job.id}`}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t.jobs.remove}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
