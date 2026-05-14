import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type CmsUser = {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  authProvider?: string;
  createdAt: string;
  organization?: { id: string; name: string } | null;
};

export default function CMSUsers() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery<CmsUser[]>({
    queryKey: ["/api/cms/users"],
  });

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
      return (
        fullName.includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Users
        </h1>
        <Badge variant="secondary" data-testid="badge-total-count">
          {users.length}
        </Badge>
      </div>

      <Card className="p-4">
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          className="max-w-sm"
          data-testid="input-search-users"
        />
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Auth Provider</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell>
                    <span className="font-medium" data-testid={`text-user-name-${user.id}`}>
                      {user.firstName || user.lastName
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                        : "-"}
                    </span>
                  </TableCell>
                  <TableCell data-testid={`text-user-email-${user.id}`}>
                    {user.email || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-user-phone-${user.id}`}>
                    {user.phone || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-auth-provider-${user.id}`}>
                      {user.authProvider || "email"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-user-org-${user.id}`}>
                    {user.organization?.name || "-"}
                  </TableCell>
                  <TableCell data-testid={`text-user-joined-${user.id}`}>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
