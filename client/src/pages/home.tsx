import { useState } from "react";
import { Link } from "wouter";
import { Download, Loader2, ChevronRight, FileAudio, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { JobCard } from "@/components/job-card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { DownloadJob } from "@shared/schema";

const qualityOptions = ["360p", "480p", "720p", "1080p", "1440p", "2160p"];

export default function Home() {
  const { t } = useApp();
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"audio" | "video">("video");
  const [quality, setQuality] = useState("720p");

  const { data: recentJobs, isLoading: jobsLoading } = useQuery<DownloadJob[]>({
    queryKey: ["/api/jobs"],
    refetchInterval: 5000,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/download", {
        url,
        format,
        quality: format === "video" ? quality : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      setUrl("");
      toast({
        title: t.common.success,
        description: format === "audio" 
          ? t.download.audio 
          : `${t.download.video} - ${quality}`,
      });
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
        title: t.errors.downloadFailed,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      toast({
        title: t.errors.invalidUrl,
        variant: "destructive",
      });
      return;
    }
    
    downloadMutation.mutate();
  };

  const displayJobs = recentJobs?.slice(0, 3) || [];

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 
          className="text-2xl font-semibold mb-6"
          data-testid="text-page-title"
        >
          {t.download.title}
        </h1>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder={t.download.urlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="text-base"
                data-testid="input-youtube-url"
              />
            </div>

            <div className="space-y-3">
              <Label>{t.download.format}</Label>
              <RadioGroup
                value={format}
                onValueChange={(value) => setFormat(value as "audio" | "video")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="audio" id="audio" data-testid="radio-format-audio" />
                  <Label htmlFor="audio" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileAudio className="h-4 w-4" />
                    {t.download.audio}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="video" data-testid="radio-format-video" />
                  <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer font-normal">
                    <FileVideo className="h-4 w-4" />
                    {t.download.video}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {format === "video" && (
              <div className="space-y-2">
                <Label htmlFor="quality">{t.download.quality}</Label>
                <Select value={quality} onValueChange={setQuality}>
                  <SelectTrigger id="quality" data-testid="select-quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((q) => (
                      <SelectItem key={q} value={q} data-testid={`option-quality-${q}`}>
                        {t.download.qualityOptions[q as keyof typeof t.download.qualityOptions] || q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!url.trim() || downloadMutation.isPending}
              data-testid="button-download"
            >
              {downloadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.download.downloading}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t.download.downloadButton}
                </>
              )}
            </Button>
          </form>
        </Card>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">{t.download.recentJobs}</h2>
            <Button variant="ghost" size="sm" asChild data-testid="link-view-all-jobs">
              <Link href="/jobs">
                {t.download.viewAllJobs}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {jobsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : displayJobs.length > 0 ? (
            <div className="space-y-3">
              {displayJobs.map((job) => (
                <JobCard key={job.id} job={job} compact />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t.download.noRecentJobs}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
