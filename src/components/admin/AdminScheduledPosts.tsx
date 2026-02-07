import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Calendar, User, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";

interface ScheduledPost {
  post_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  content: string;
  photo_url: string | null;
  scheduled_time: string;
  status: string;
  created_at: string;
  tracking_id: string | null;
}

export const AdminScheduledPosts = () => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchScheduledPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_scheduled_posts') as { 
        data: ScheduledPost[] | null; 
        error: any;
      };

      if (error) {
        console.error("Error fetching scheduled posts:", error);
        return;
      }

      setPosts(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const isOverdue = (scheduledTime: string) => {
    return new Date(scheduledTime) < new Date();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Scheduled Posts
          <Badge variant="secondary" className="ml-1">{posts.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchScheduledPosts} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="w-8 h-8 mb-2" />
            <p className="text-sm">No scheduled posts</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Image</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.post_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {post.user_name || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">{post.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="flex items-start gap-1">
                        <FileText className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="text-sm line-clamp-2">{post.content}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {format(new Date(post.scheduled_time), "MMM d, yyyy")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.scheduled_time), "h:mm a")}
                        </span>
                        {isOverdue(post.scheduled_time) ? (
                          <Badge variant="destructive" className="mt-1 w-fit text-[10px]">
                            Overdue
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(post.scheduled_time), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={post.status === "posting" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {post.photo_url ? (
                        <img
                          src={post.photo_url}
                          alt="Post"
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
