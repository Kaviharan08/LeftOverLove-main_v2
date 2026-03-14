import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Ban } from "lucide-react";

interface BanUserDialogProps {
  userId: string;
  userName: string;
  isBanned: boolean;
  onComplete: () => void;
}

export function BanUserDialog({ userId, userName, isBanned, onComplete }: BanUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBanToggle = async () => {
    setLoading(true);
    const newBanned = !isBanned;

    const { error } = await supabase
      .from("profiles")
      .update({
        is_banned: newBanned,
        ban_reason: newBanned ? reason.trim() || null : null,
      })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Log action to audit log
      await supabase.from("admin_audit_log" as any).insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: newBanned ? "ban_user" : "unban_user",
        target_type: "user",
        target_id: userId,
        details: { user_name: userName, reason: reason.trim() || null },
      });

      toast({ title: newBanned ? "User banned" : "User unbanned" });
      onComplete();
    }
    setLoading(false);
    setOpen(false);
    setReason("");
  };

  return (
    <>
      <Button
        variant={isBanned ? "outline" : "destructive"}
        size="sm"
        onClick={() => setOpen(true)}
        className={isBanned ? "border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30" : ""}
      >
        <Ban className="h-4 w-4 mr-1" />
        {isBanned ? "Unban" : "Ban"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isBanned ? "Unban" : "Ban"} User: {userName}</DialogTitle>
            <DialogDescription>
              {isBanned
                ? "This will restore the user's access to the platform."
                : "This will prevent the user from accessing the platform."}
            </DialogDescription>
          </DialogHeader>
          {!isBanned && (
            <Textarea
              placeholder="Reason for banning (optional)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant={isBanned ? "default" : "destructive"}
              onClick={handleBanToggle}
              disabled={loading}
            >
              {loading ? "Processing..." : isBanned ? "Unban User" : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
