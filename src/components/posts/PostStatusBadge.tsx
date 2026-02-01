import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import type { PostStatus } from "@/hooks/usePostsClean";

interface PostStatusBadgeProps {
  status: PostStatus;
  linkedinUrl?: string | null;
  error?: string | null;
}

/**
 * UI component for displaying post status.
 * 
 * Status display rules:
 * - pending → "Queued" (yellow)
 * - posting → "Posting now..." (blue + spinner)
 * - posted → "Posted ✅" + LinkedIn URL (green)
 * - failed → error message (red)
 */
export const PostStatusBadge = ({ status, linkedinUrl, error }: PostStatusBadgeProps) => {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" />
          Queued
        </Badge>
      );
    
    case 'posting':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Posting now...
        </Badge>
      );
    
    case 'posted':
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Posted ✅
          </Badge>
          {linkedinUrl && (
            <a 
              href={linkedinUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View on LinkedIn →
            </a>
          )}
        </div>
      );
    
    case 'failed':
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="destructive" className="w-fit">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
        </div>
      );
    
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
};
