import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Users,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

type QueueStatus = {
  tokenNumber: number;
  status: string;
  queuePosition: number;
  estimatedWaitMinutes: number;
  doctor: { name: string; specialization: string | null } | null;
  currentlyServing: number | null;
  scheduledTime: string | null;
  symptoms: string | null;
};

export default function QueueTracker() {
  const { orgId, visitId } = useParams();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: queueStatus, isLoading, isError, refetch } = useQuery<QueueStatus>({
    queryKey: ["/api/public/queue", visitId],
    queryFn: async () => {
      const res = await fetch(`/api/public/queue/${visitId}`);
      if (!res.ok) throw new Error("Failed to fetch queue status");
      return res.json();
    },
    enabled: !!visitId,
    refetchInterval: autoRefresh ? 10000 : false,
  });

  useEffect(() => {
    if (queueStatus?.status === "completed" || queueStatus?.status === "cancelled") {
      setAutoRefresh(false);
    }
  }, [queueStatus?.status]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !queueStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Queue Status</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find your booking. Please check your booking link.
            </p>
            <Button onClick={() => refetch()} data-testid="button-retry">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; label: string; description: string }> = {
      booked: {
        color: "bg-blue-100 text-blue-800",
        label: "Booked",
        description: "Your appointment is confirmed. Please arrive on time.",
      },
      waiting: {
        color: "bg-amber-100 text-amber-800",
        label: "Waiting",
        description: "You're in the queue. Please wait for your turn.",
      },
      in_consultation: {
        color: "bg-green-100 text-green-800",
        label: "In Consultation",
        description: "The doctor is seeing you now.",
      },
      completed: {
        color: "bg-gray-100 text-gray-800",
        label: "Completed",
        description: "Your consultation has been completed.",
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        label: "Cancelled",
        description: "This appointment has been cancelled.",
      },
    };
    return configs[status] || { color: "bg-gray-100 text-gray-800", label: status, description: "" };
  };

  const statusConfig = getStatusConfig(queueStatus.status);
  const progress = queueStatus.status === "completed" ? 100 : 
    queueStatus.status === "in_consultation" ? 90 :
    Math.max(10, 100 - (queueStatus.queuePosition * 15));

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-white py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Queue Tracker</h1>
          <p className="text-muted-foreground">Real-time consultation queue status</p>
        </div>

        <Card className="shadow-lg overflow-hidden">
          <div className={`p-6 text-center ${statusConfig.color}`}>
            <p className="text-sm font-medium mb-1">Your Token Number</p>
            <p className="text-6xl font-bold">#{queueStatus.tokenNumber}</p>
          </div>

          <CardContent className="pt-6 space-y-6">
            <div className="text-center">
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              <p className="text-sm text-muted-foreground mt-2">{statusConfig.description}</p>
            </div>

            {(queueStatus.status === "booked" || queueStatus.status === "waiting") && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Queue Progress</span>
                    <span className="font-medium">{queueStatus.queuePosition} ahead</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{queueStatus.queuePosition}</p>
                    <p className="text-xs text-muted-foreground">People ahead</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">~{queueStatus.estimatedWaitMinutes}</p>
                    <p className="text-xs text-muted-foreground">Minutes wait</p>
                  </div>
                </div>

                {queueStatus.currentlyServing && (
                  <div className="text-center p-4 border rounded-lg bg-green-50">
                    <p className="text-sm text-muted-foreground">Currently Serving</p>
                    <p className="text-3xl font-bold text-green-700">#{queueStatus.currentlyServing}</p>
                  </div>
                )}
              </>
            )}

            {queueStatus.doctor && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Stethoscope className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{queueStatus.doctor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {queueStatus.doctor.specialization || "General Physician"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {queueStatus.scheduledTime && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Scheduled Time:</span>
                <span className="font-medium">{queueStatus.scheduledTime}</span>
              </div>
            )}

            {queueStatus.status === "completed" && (
              <div className="text-center py-6">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold">Consultation Completed</h3>
                <p className="text-muted-foreground mt-2">
                  Thank you for visiting. Take care!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-queue"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Page refreshes every 10 seconds automatically
        </p>
      </div>
    </div>
  );
}
