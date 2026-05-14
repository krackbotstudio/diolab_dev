import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown } from "lucide-react";

interface ActivityEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: any;
  createdAt: string;
}

function formatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
}

function truncateId(id: string | null, length: number = 8): string {
  if (!id) return "-";
  return id.length > length ? id.substring(0, length) + "..." : id;
}

function formatDetails(details: any): string {
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function truncateDetails(details: any, maxLength: number = 50): string {
  const str = formatDetails(details);
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
}

function ActivityRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
    </TableRow>
  );
}

export default function CMSActivity() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    data: activity,
    isLoading,
    error,
  } = useQuery<ActivityEntry[]>({
    queryKey: ["/api/cms/dashboard/activity"],
  });

  const filteredActivity = useMemo(() => {
    if (!activity) return [];
    
    const term = searchTerm.toLowerCase();
    return activity.filter((entry) => {
      const emailMatch = entry.adminEmail.toLowerCase().includes(term);
      const actionMatch = entry.action.toLowerCase().includes(term);
      const targetTypeMatch = entry.targetType.toLowerCase().includes(term);
      return emailMatch || actionMatch || targetTypeMatch;
    });
  }, [activity, searchTerm]);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-red-600 dark:text-red-400 mt-4">
          Error loading activity log
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="cms-activity">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-activity">
          Activity Log
        </h1>
        <p className="text-muted-foreground mt-2">Track all admin actions</p>
      </div>

      <Card data-testid="card-activity-filter">
        <CardContent className="pt-6">
          <Input
            placeholder="Search by admin email, action, or target type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            data-testid="input-search-activity"
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card data-testid="card-activity-table">
        <CardHeader>
          <CardTitle>Activity Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <ActivityRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          ) : filteredActivity.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-state-activity">
              <p className="text-muted-foreground">No activity recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target Type</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivity.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const fullDetails = formatDetails(entry.details);
                  const truncatedDetails = truncateDetails(entry.details);

                  return (
                    <TableRow key={entry.id} data-testid={`row-activity-${entry.id}`}>
                      <TableCell className="text-sm" data-testid={`cell-timestamp-${entry.id}`}>
                        {formatTimestamp(entry.createdAt)}
                      </TableCell>
                      <TableCell data-testid={`cell-admin-${entry.id}`}>
                        <Badge variant="secondary">{entry.adminEmail}</Badge>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`cell-action-${entry.id}`}>
                        {entry.action}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`cell-target-type-${entry.id}`}>
                        {entry.targetType}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`cell-target-id-${entry.id}`}>
                        {truncateId(entry.targetId)}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`cell-details-${entry.id}`}>
                        {fullDetails.length > 50 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="text-xs truncate max-w-xs cursor-pointer hover-elevate px-2 py-1 rounded inline-flex items-center gap-1"
                                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                data-testid={`button-toggle-details-${entry.id}`}
                              >
                                {truncatedDetails}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-sm">
                              <code className="text-xs">{fullDetails}</code>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs">{truncatedDetails}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
