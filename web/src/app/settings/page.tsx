"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const user = useQuery(api.users.currentUser, {});
  const update = useMutation(api.users.updateDigestAddresses);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setFrom(user.digestFromAddress ?? "");
      setTo(user.digestToAddress ?? user.email ?? "");
    }
  }, [user]);

  const save = async () => {
    setBusy(true);
    try {
      await update({
        digestFromAddress: from.trim() || undefined,
        digestToAddress: to.trim() || undefined,
      });
      toast.success("Saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SettingsIcon />}
        tone="default"
        title="Settings"
        description="Configure your digest email addresses and view account info."
      />

      <Card>
        <CardHeader>
          <CardTitle>Email digest</CardTitle>
          <CardDescription>
            Set the from / to addresses used by the dispatch button on the Email page. The Resend
            sandbox sender works for testing; for production, verify a domain in Resend and use
            an address from that domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">From address</Label>
            <Input
              id="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="ClassroomSuite <onboarding@resend.dev>"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the Resend sandbox sender.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To address (digest destination)</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button onClick={save} disabled={busy} size="sm">
            <Save />
            Save
          </Button>
        </CardContent>
      </Card>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {user.name || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {user.email}
            </p>
            <p>
              <span className="text-muted-foreground">Role:</span> {user.role}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
