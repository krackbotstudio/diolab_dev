import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, X, CheckCircle2 } from "lucide-react";

const recentUpdates = [
  { version: "v2.0.0", date: "February 2026", update: "Cross-module referrals - doctors can send prescriptions to pharmacy or refer patients for lab tests in one click" },
  { version: "v1.9.0", date: "February 2026", update: "Medlab Customers page - unified customer tracking across pharmacy sales, online orders, and doctor referrals" },
  { version: "v1.8.0", date: "February 2026", update: "ICU Dashboard with real-time vitals monitoring, critical alerts, and ventilator tracking" },
  { version: "v1.7.0", date: "February 2026", update: "Ward & Bed Management - visual bed grid, patient admissions, discharges, and transfers" },
  { version: "v1.6.0", date: "February 2026", update: "Camera-based medicine identification - photograph any medicine strip/box for instant AI identification" },
  { version: "v1.5.0", date: "February 2026", update: "Staff Management with role-based permissions, module access control, and page-level visibility" },
  { version: "v1.4.0", date: "January 2026", update: "Online Pharmacy portal - patients can browse medicines and place orders online" },
  { version: "v1.3.0", date: "January 2026", update: "AI drug interaction warnings during prescription and pharmacy dispensing" },
  { version: "v1.2.0", date: "January 2026", update: "Prescription management with PDF print and WhatsApp sharing" },
  { version: "v1.1.0", date: "January 2026", update: "AI Consultation Listener - real-time transcription and diagnosis suggestions" },
  { version: "v1.0.0", date: "January 2026", update: "Custom email/phone authentication with Google sign-in" },
  { version: "v0.9.5", date: "January 2026", update: "Logo upload and custom branding colors for reports" },
  { version: "v0.9.0", date: "December 2025", update: "Online booking portal for patients with live queue tracking" },
  { version: "v0.8.0", date: "December 2025", update: "Multi-branch support with centralized management" },
  { version: "v0.7.0", date: "November 2025", update: "AI-generated patient-friendly report summaries" },
];

export function UpdatesPopup() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 left-6 z-[9998]">
          <Button
            variant="outline"
            onClick={() => setIsOpen(true)}
            data-testid="button-open-updates"
            className="rounded-full shadow-lg gap-2 bg-background"
          >
            <Bell className="h-4 w-4" />
            <span>What's New</span>
          </Button>
        </div>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 left-6 z-[9998] w-[340px] max-w-[calc(100vw-48px)] shadow-2xl" data-testid="card-updates-popup">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">What's New</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-updates"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[350px]">
              <div className="p-4 space-y-3">
                {recentUpdates.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    data-testid={`update-item-${index}`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {item.version}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                      </div>
                      <p className="text-sm">{item.update}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  );
}
