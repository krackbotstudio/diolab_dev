import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  User,
  Clock,
  Calendar,
  Stethoscope,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Save,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Pill,
  Home,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { useSignaling, SignalingMessage } from "@/hooks/use-signaling";

type VideoConsultationData = {
  visit: {
    id: string;
    status: string;
    consultationType: string;
    scheduledDate: string | null;
    scheduledTime: string | null;
    meetingRoomId: string;
    symptoms: string | null;
    diagnosis: string | null;
    notes: string | null;
    consultationFee: string | null;
    paymentStatus: string | null;
    patientId: string;
    doctorId: string | null;
    organizationId: string;
  };
  doctor: {
    id: string;
    name: string;
    specialization: string | null;
    qualification: string | null;
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    gender: string | null;
  };
  organization: {
    id: string;
    name: string;
    logo: string | null;
    phone: string | null;
    email: string | null;
  };
};

type PrescriptionItem = {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: string;
};

export default function VideoRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [waitingForDoctor, setWaitingForDoctor] = useState(false);
  const [, navigate] = useLocation();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const sendSignalingMessageRef = useRef<(type: "offer" | "answer" | "ice-candidate" | "join-room" | "ready", payload: any) => void>(() => { });

  const [showPrescriptionPanel, setShowPrescriptionPanel] = useState(() => {
    return typeof window !== "undefined" && window.innerWidth >= 1024;
  });
  const [consultForm, setConsultForm] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
  });
  const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionItem>({
    medicineName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
    quantity: "",
  });
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [followUpDate, setFollowUpDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [prescriptionsSaved, setPrescriptionsSaved] = useState(false);

  const { data: consultationData, isLoading, isError } = useQuery<VideoConsultationData>({
    queryKey: ["/api/public/video-consultation", roomId],
    queryFn: async () => {
      const res = await fetch(`/api/public/video-consultation/${roomId}`);
      if (!res.ok) throw new Error("Consultation not found");
      return res.json();
    },
    enabled: !!roomId,
  });

  const { data: staffData } = useQuery<{ isOwner: boolean; role: string; moduleAccess: string[] }>({
    queryKey: ["/api/staff/me"],
    enabled: isAuthenticated,
  });

  const { data: orgData } = useQuery<{ organization: { id: string } }>({
    queryKey: ["/api/organizations/my"],
    enabled: isAuthenticated,
  });

  const isDoctor = isAuthenticated && !!consultationData && !!orgData?.organization &&
    orgData.organization.id === consultationData.visit.organizationId &&
    !!staffData && (staffData.isOwner || staffData.role === "doctor" || staffData.role === "admin" || staffData.role === "manager");

  useEffect(() => {
    if (consultationData?.visit) {
      setConsultForm({
        symptoms: consultationData.visit.symptoms || "",
        diagnosis: consultationData.visit.diagnosis || "",
        notes: consultationData.visit.notes || "",
      });
    }
  }, [consultationData?.visit]);

  const updateVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/op-pos/op-visits/${consultationData?.visit.id}`, data);
      return res.json();
    },
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/op-pos/prescriptions", data);
      return res.json();
    },
  });

  const completeVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("POST", `/api/op-pos/op-visits/${id}/complete`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/video-consultation", roomId] });
      toast({ title: "Consultation Completed", description: "The video consultation has been completed successfully." });
    },
  });

  const startLocalStream = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("navigator.mediaDevices.getUserMedia is not supported or not available in this context (likely non-HTTPS/secure context).");
      }
      console.log("[WebRTC] Requesting local media stream...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log("[WebRTC] Local media stream obtained.");
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("[WebRTC] Error obtaining local media:", err);
      toast({
        title: "Camera/Microphone Error",
        description: "Please allow camera and microphone access to join the video call.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const joinCall = async () => {
    // 1. Join the room signaling-wise first
    setIsCallActive(true);
    if (!isDoctor) {
      setWaitingForDoctor(true);
    }
    
    // 2. Start the timer
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // 3. Update visit status if doctor
    if (isDoctor && consultationData?.visit.status === "booked") {
      updateVisitMutation.mutate({ status: "in_consultation" });
    }

    // 4. Try to start the local stream
    const stream = await startLocalStream();
    
    // 5. Tell others we are ready (even if no stream yet, to establish signaling)
    sendSignalingMessageRef.current("ready", { hasStream: !!stream });

    toast({
      title: "Joined room",
      description: isDoctor ? "You have joined the video consultation." : "Waiting for the doctor to join...",
    });
  };

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[WebRTC] Local ICE candidate found:", event.candidate);
        sendSignalingMessageRef.current("ice-candidate", event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE Connection State:", pc.iceConnectionState);
    };

    pc.ontrack = (event) => {
      console.log("[WebRTC] Remote track received:", event.streams[0]);
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setIsRemoteConnected(true);
      setWaitingForDoctor(false);
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection State:", pc.connectionState);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        setIsRemoteConnected(false);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, []);

  const handleSignalingMessage = useCallback(async (message: SignalingMessage) => {
    switch (message.type) {
      case "offer":
        if (!peerConnectionRef.current) createPeerConnection();
        await peerConnectionRef.current!.setRemoteDescription(new RTCSessionDescription(message.payload));
        const answer = await peerConnectionRef.current!.createAnswer();
        await peerConnectionRef.current!.setLocalDescription(answer);
        sendSignalingMessageRef.current("answer", answer);
        break;
      case "answer":
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.payload));
        }
        break;
      case "ice-candidate":
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.payload));
          } catch (e) {
            console.error("Error adding ice candidate", e);
          }
        }
        break;
      case "ready":
        // When someone is ready, initiate offer if we are also in the call
        if (isCallActive) {
          const pc = peerConnectionRef.current || createPeerConnection();
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignalingMessageRef.current("offer", offer);
        }
        break;
      case "join-room":
        // Just acknowledging join-room, no offer initiation here
        break;
    }
  }, [createPeerConnection, isCallActive]);

  const { sendSignalingMessage } = useSignaling(roomId, handleSignalingMessage);
  sendSignalingMessageRef.current = sendSignalingMessage;

  const leaveCall = () => {
    stopLocalStream();
    setIsCallActive(false);
    setWaitingForDoctor(false);
    setIsRemoteConnected(false);
    setCallDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    toast({
      title: "Call ended",
      description: "You have left the video consultation.",
    });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const addPrescription = () => {
    if (!prescriptionForm.medicineName.trim()) {
      toast({ title: "Error", description: "Medicine name is required", variant: "destructive" });
      return;
    }
    setPrescriptions([...prescriptions, { ...prescriptionForm }]);
    setPrescriptionForm({
      medicineName: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      quantity: "",
    });
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const savePrescriptionsAndNotes = async (): Promise<boolean> => {
    if (!consultationData?.visit || !consultationData.organization) return false;
    setIsSaving(true);

    try {
      await updateVisitMutation.mutateAsync({
        symptoms: consultForm.symptoms,
        diagnosis: consultForm.diagnosis,
        notes: consultForm.notes,
      });

      for (const prescription of prescriptions) {
        await createPrescriptionMutation.mutateAsync({
          opVisitId: consultationData.visit.id,
          organizationId: consultationData.organization.id,
          medicineName: prescription.medicineName,
          dosage: prescription.dosage || null,
          frequency: prescription.frequency || null,
          duration: prescription.duration || null,
          instructions: prescription.instructions || null,
          quantity: prescription.quantity ? parseInt(prescription.quantity) : null,
          followUpDate: followUpDate || null,
        });
      }

      setPrescriptionsSaved(true);
      toast({ title: "Saved", description: "Consultation notes and prescriptions saved successfully." });
      return true;
    } catch (err) {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!consultationData?.visit) return;

    if (prescriptions.length > 0 && !prescriptionsSaved) {
      const saved = await savePrescriptionsAndNotes();
      if (!saved) return;
    } else {
      await updateVisitMutation.mutateAsync({
        symptoms: consultForm.symptoms,
        diagnosis: consultForm.diagnosis,
        notes: consultForm.notes,
      });
    }

    try {
      await completeVisitMutation.mutateAsync({
        id: consultationData.visit.id,
        data: {
          consultationFee: consultationData.visit.consultationFee || "500",
          paymentMode: "online",
        },
      });
      leaveCall();
    } catch (err) {
      toast({ title: "Error", description: "Failed to complete consultation. Please try again.", variant: "destructive" });
    }
  };

  useEffect(() => {
    return () => {
      stopLocalStream();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stopLocalStream]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading consultation details...</p>
        </div>
      </div>
    );
  }

  if (isError || !consultationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Consultation Not Found</h2>
            <p className="text-muted-foreground">
              This video consultation link is invalid or has expired. Please check your booking details and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { visit, doctor, patient, organization } = consultationData;
  const isCompleted = visit.status === "completed";
  const isCancelled = visit.status === "cancelled";

  return (
    <div ref={containerRef} className="min-h-screen bg-background" data-testid="video-room-page">
      <div className="flex items-center justify-between p-4 border-b flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {organization.logo && (
            <img
              src={organization.logo}
              alt={organization.name}
              className="h-8 w-8 rounded-md object-cover"
            />
          )}
          <div>
            <h1 className="text-lg font-bold" data-testid="text-org-name">{organization.name}</h1>
            <p className="text-xs text-muted-foreground">Video Consultation</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isDoctor && (
            <Badge variant="outline" data-testid="badge-doctor-mode">
              <Stethoscope className="h-3 w-3 mr-1" />
              Doctor Mode
            </Badge>
          )}
          {isCallActive && (
            <>
              <Badge variant="destructive" className="animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white mr-1.5 inline-block" />
                LIVE
              </Badge>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(callDuration)}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        <div className={`flex-1 flex flex-col overflow-auto p-4 ${isDoctor && isCallActive && showPrescriptionPanel ? "lg:w-[60%]" : "w-full"}`}>
          {!isCallActive ? (
            <div className="flex-1 flex items-center justify-center">
              <Card className="max-w-lg w-full">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center gap-6 text-center">
                    {isCompleted ? (
                      <>
                        <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <div>
                          <p className="text-lg font-medium">Consultation Completed</p>
                          <p className="text-sm text-muted-foreground mt-1">This video consultation has ended.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
                          {isDoctor && (
                            <Button
                              data-testid="button-back-to-dashboard"
                              className="w-full sm:w-auto"
                              onClick={() => navigate("/doctor-console")}
                            >
                              <Home className="h-4 w-4 mr-2" />
                              Back to Dashboard
                            </Button>
                          )}
                          <Button
                            data-testid="button-rejoin-call"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => {
                              queryClient.invalidateQueries({ queryKey: ["/api/public/video-consultation", roomId] });
                              setCallDuration(0);
                              setPrescriptionsSaved(false);
                              joinCall();
                            }}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Rejoin Call
                          </Button>
                        </div>
                      </>
                    ) : isCancelled ? (
                      <>
                        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                          <AlertCircle className="h-10 w-10 text-destructive" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-destructive">Consultation Cancelled</p>
                          <p className="text-sm text-muted-foreground mt-1">This video consultation has been cancelled.</p>
                        </div>
                        {isDoctor && (
                          <Button
                            data-testid="button-back-to-dashboard-cancelled"
                            onClick={() => navigate("/doctor-console")}
                          >
                            <Home className="h-4 w-4 mr-2" />
                            Back to Dashboard
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                          <Video className="h-10 w-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-medium">Ready to join?</p>
                          <p className="text-sm text-muted-foreground max-w-md">
                            {isDoctor
                              ? `Join the video consultation with ${patient.firstName} ${patient.lastName}. Your prescription panel will appear alongside the call.`
                              : `Click below to start your video consultation with ${doctor.name}. Make sure your camera and microphone are working.`
                            }
                          </p>
                        </div>

                        <div className="space-y-3 w-full text-left">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-muted-foreground">Patient</span>
                            <span className="font-medium">{patient.firstName} {patient.lastName}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-muted-foreground">Doctor</span>
                            <span className="font-medium">{doctor.name}</span>
                          </div>
                          {visit.scheduledDate && (
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-muted-foreground">Date</span>
                              <span>{format(new Date(visit.scheduledDate + "T00:00:00"), "MMM dd, yyyy")}</span>
                            </div>
                          )}
                          {visit.scheduledTime && (
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="text-muted-foreground">Time</span>
                              <span>{formatTimeSlot(visit.scheduledTime)}</span>
                            </div>
                          )}
                          {visit.symptoms && (
                            <div className="text-sm">
                              <span className="text-muted-foreground block mb-1">Symptoms</span>
                              <p>{visit.symptoms}</p>
                            </div>
                          )}
                        </div>

                        <Button
                          size="lg"
                          onClick={joinCall}
                          className="gap-2 w-full"
                          data-testid="button-join-call"
                        >
                          <Video className="h-5 w-5" />
                          {isDoctor ? "Join & Start Consultation" : "Join Video Call"}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0">
                <Card className="overflow-visible">
                  <CardContent className="p-0 h-full">
                    <div className="aspect-video bg-muted rounded-md relative overflow-hidden">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover rounded-md"
                      />
                      {!isVideoEnabled && (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <div className="h-16 w-16 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                            <VideoOff className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary">{isDoctor ? `Dr. ${doctor.name}` : "You"}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-visible">
                  <CardContent className="p-0 h-full">
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover rounded-md ${!isRemoteConnected ? "hidden" : ""}`}
                      />
                      {!isRemoteConnected && (
                        <div className="text-center space-y-3 px-4">
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            {isDoctor ? <User className="h-8 w-8 text-primary" /> : <Stethoscope className="h-8 w-8 text-primary" />}
                          </div>
                          <div>
                            <p className="font-medium">{isDoctor ? `${patient.firstName} ${patient.lastName}` : doctor.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Waiting to connect...
                            </p>
                          </div>
                          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary">{isDoctor ? "Patient" : doctor.name}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button
                      variant={isVideoEnabled ? "outline" : "destructive"}
                      size="icon"
                      onClick={toggleVideo}
                      data-testid="button-toggle-video"
                    >
                      {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant={isAudioEnabled ? "outline" : "destructive"}
                      size="icon"
                      onClick={toggleAudio}
                      data-testid="button-toggle-audio"
                    >
                      {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant={isSpeakerMuted ? "destructive" : "outline"}
                      size="icon"
                      onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                      data-testid="button-toggle-speaker"
                    >
                      {isSpeakerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <Separator orientation="vertical" className="h-9" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleFullscreen}
                      data-testid="button-toggle-fullscreen"
                    >
                      {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>
                    {isDoctor && (
                      <>
                        <Separator orientation="vertical" className="h-9" />
                        <Button
                          variant="outline"
                          onClick={() => setShowPrescriptionPanel(!showPrescriptionPanel)}
                          className="gap-1.5"
                          data-testid="button-toggle-prescription-panel"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="hidden sm:inline">{showPrescriptionPanel ? "Hide Rx" : "Show Rx"}</span>
                        </Button>
                      </>
                    )}
                    <Separator orientation="vertical" className="h-9" />
                    {isDoctor ? (
                      <Button
                        variant="destructive"
                        onClick={handleCompleteConsultation}
                        className="gap-2"
                        disabled={completeVisitMutation.isPending || isSaving}
                        data-testid="button-complete-consultation"
                      >
                        {(completeVisitMutation.isPending || isSaving) && <Loader2 className="h-4 w-4 animate-spin" />}
                        <CheckCircle className="h-5 w-5" />
                        Complete & End
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={leaveCall}
                        className="gap-2"
                        data-testid="button-leave-call"
                      >
                        <PhoneOff className="h-5 w-5" />
                        End Call
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {isDoctor && isCallActive && showPrescriptionPanel && (
          <div className="fixed inset-0 z-50 bg-background lg:static lg:inset-auto lg:z-auto lg:w-[400px] lg:border-l flex flex-col" data-testid="prescription-panel">
            <div className="p-3 border-b flex items-center justify-between gap-2">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Consultation & Prescription
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowPrescriptionPanel(false)}
                data-testid="button-close-panel"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4 text-primary" />
                    Patient Info
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Name</span>
                      <p className="font-medium" data-testid="text-rx-patient-name">{patient.firstName} {patient.lastName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Phone</span>
                      <p>{patient.phone}</p>
                    </div>
                    {patient.gender && (
                      <div>
                        <span className="text-muted-foreground text-xs">Gender</span>
                        <p className="capitalize">{patient.gender}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Consultation Notes
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Symptoms</Label>
                      <Textarea
                        value={consultForm.symptoms}
                        onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })}
                        placeholder="Enter patient symptoms..."
                        className="text-sm min-h-[60px] resize-none"
                        data-testid="input-rx-symptoms"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Diagnosis</Label>
                      <Input
                        value={consultForm.diagnosis}
                        onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
                        placeholder="Enter diagnosis..."
                        className="text-sm"
                        data-testid="input-rx-diagnosis"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={consultForm.notes}
                        onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })}
                        placeholder="Additional notes..."
                        className="text-sm min-h-[50px] resize-none"
                        data-testid="input-rx-notes"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Pill className="h-4 w-4 text-primary" />
                      Prescription
                    </div>
                    {prescriptions.length > 0 && (
                      <Badge variant="secondary">{prescriptions.length} medicine{prescriptions.length > 1 ? "s" : ""}</Badge>
                    )}
                  </div>

                  {prescriptions.length > 0 && (
                    <div className="space-y-2">
                      {prescriptions.map((rx, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-2 p-2 rounded-md border text-sm"
                          data-testid={`prescription-item-${index}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{rx.medicineName}</p>
                            <p className="text-xs text-muted-foreground">
                              {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(" | ") || "No details"}
                            </p>
                            {rx.instructions && (
                              <p className="text-xs text-muted-foreground mt-0.5">{rx.instructions}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-7 w-7"
                            onClick={() => removePrescription(index)}
                            data-testid={`button-remove-rx-${index}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 p-3 rounded-md border border-dashed">
                    <Input
                      value={prescriptionForm.medicineName}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medicineName: e.target.value })}
                      placeholder="Medicine name *"
                      className="text-sm"
                      data-testid="input-medicine-name"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={prescriptionForm.dosage}
                        onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                        placeholder="Dosage (e.g. 500mg)"
                        className="text-sm"
                        data-testid="input-dosage"
                      />
                      <Input
                        value={prescriptionForm.frequency}
                        onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                        placeholder="Frequency (e.g. 1-0-1)"
                        className="text-sm"
                        data-testid="input-frequency"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={prescriptionForm.duration}
                        onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                        placeholder="Duration (e.g. 5 days)"
                        className="text-sm"
                        data-testid="input-duration"
                      />
                      <Input
                        value={prescriptionForm.quantity}
                        onChange={(e) => setPrescriptionForm({ ...prescriptionForm, quantity: e.target.value })}
                        placeholder="Qty"
                        className="text-sm"
                        data-testid="input-quantity"
                      />
                    </div>
                    <Input
                      value={prescriptionForm.instructions}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                      placeholder="Instructions (e.g. After food)"
                      className="text-sm"
                      data-testid="input-instructions"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addPrescription}
                      className="w-full gap-1.5"
                      data-testid="button-add-medicine"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Medicine
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs">Follow-up Date</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="text-sm"
                    min={new Date().toISOString().split("T")[0]}
                    data-testid="input-follow-up-date"
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="p-3 border-t space-y-2">
              <Button
                onClick={savePrescriptionsAndNotes}
                disabled={isSaving}
                className="w-full gap-1.5"
                variant="outline"
                data-testid="button-save-prescription"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notes & Prescription
              </Button>
              <Button
                onClick={handleCompleteConsultation}
                disabled={completeVisitMutation.isPending || isSaving}
                className="w-full gap-1.5"
                data-testid="button-complete-and-end"
              >
                {(completeVisitMutation.isPending || isSaving) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Complete Consultation
              </Button>
            </div>
          </div>
        )}

        {isDoctor && isCallActive && !showPrescriptionPanel && (
          <div className="hidden lg:flex items-start pt-4 pr-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowPrescriptionPanel(true)}
              data-testid="button-open-panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
