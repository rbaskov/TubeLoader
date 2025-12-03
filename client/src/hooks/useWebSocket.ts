import { useEffect, useRef, useCallback, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import type { DownloadJob } from "@shared/schema";

interface WebSocketMessage {
  type: "job_update" | "job_deleted";
  job?: DownloadJob;
  jobId?: string;
  speed?: string;
  eta?: string;
}

// Global store for job progress info (speed, ETA)
export const jobProgressInfo = new Map<string, { speed?: string; eta?: string }>();

export function useWebSocket(userId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const connect = useCallback(() => {
    if (!userId) return;
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === "job_update") {
            // Store speed and ETA info
            if (message.job?.id) {
              if (message.speed || message.eta) {
                jobProgressInfo.set(message.job.id, {
                  speed: message.speed,
                  eta: message.eta,
                });
              } else {
                // Clear when job completes
                jobProgressInfo.delete(message.job.id);
              }
            }
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
            setUpdateTrigger(prev => prev + 1);
          } else if (message.type === "job_deleted") {
            if (message.jobId) {
              jobProgressInfo.delete(message.jobId);
            }
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected, attempting reconnect...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }
  }, [userId]);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  return { ws: wsRef.current, updateTrigger };
}

// Hook to get progress info for a specific job
export function useJobProgressInfo(jobId: string) {
  const info = jobProgressInfo.get(jobId);
  return info || { speed: undefined, eta: undefined };
}
