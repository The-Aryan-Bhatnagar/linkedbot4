import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Send, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface PreviewPost {
  content: string;
  imageUrl?: string;
  agentType?: string;
}

interface SchedulingDialogProps {
  open: boolean;
  previewPost: PreviewPost | null;
  onPostNow: () => void;
  onSchedule: (date: Date, time: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SchedulingDialog({
  open,
  previewPost,
  onPostNow,
  onSchedule,
  onCancel,
  isLoading = false,
}: SchedulingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedTime, setSelectedTime] = useState<string>("09:00");

  const handleSchedule = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDate = new Date(year, month - 1, day, hours, minutes);
    onSchedule(scheduledDate, selectedTime);
  };

  // Quick schedule options
  const quickOptions = [
    { label: "Now", getValue: () => new Date() },
    { label: "In 1 hour", getValue: () => new Date(Date.now() + 60 * 60 * 1000) },
    { label: "Tomorrow 9 AM", getValue: () => {
      const d = addDays(new Date(), 1);
      d.setHours(9, 0, 0, 0);
      return d;
    }},
    { label: "Tomorrow 2 PM", getValue: () => {
      const d = addDays(new Date(), 1);
      d.setHours(14, 0, 0, 0);
      return d;
    }},
  ];

  if (!previewPost) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Schedule Your Post
          </DialogTitle>
          <DialogDescription>
            Review your post and choose when to publish
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Post Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Post Preview</Label>
            <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {previewPost.content}
              </p>
              {previewPost.imageUrl && (
                <img
                  src={previewPost.imageUrl}
                  alt="Post image"
                  className="w-full max-h-48 object-cover rounded-lg"
                />
              )}
            </div>
          </div>

          {/* Quick Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Schedule</Label>
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((option, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const date = option.getValue();
                    if (option.label === "Now") {
                      onPostNow();
                    } else {
                      setSelectedDate(format(date, "yyyy-MM-dd"));
                      setSelectedTime(format(date, "HH:mm"));
                    }
                  }}
                  disabled={isLoading}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Time (IST)
              </Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              variant="default"
              className="flex-1 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              Schedule Post
            </Button>
            <Button
              onClick={onPostNow}
              variant="success"
              className="flex-1 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Post Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
