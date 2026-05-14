import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { UpdatesPopup } from "@/components/updates-popup";
import { DioChatAssistant } from "@/components/dio-chat-assistant";
import SEO from "@/components/SEO";
import {
  FlaskConical,
  Users,
  Receipt,
  FileText,
  Boxes,
  Building2,
  Shield,
  Zap,
  Brain,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Smartphone,
  Palette,
  UserPlus,
  BarChart3,
  Sparkles,
  Gift,
  MessageSquare,
  Stethoscope,
  Pill,
  Mic,
  ScanBarcode,
  ClipboardList,
  Globe,
  HeartPulse,
  Activity,
  AlertTriangle,
  BedDouble,
  Camera,
  Send,
  ShieldCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logoSymbol from "@assets/diolab_-_logo_-_color_-_symbol_1769252295192.png";
import heroImage from "@assets/hero-healthcare.jpg";
import heroAiConsultation from "../assets/images/hero-ai-consultation.png";
import heroCameraMedicine from "../assets/images/hero-camera-medicine.png";
import heroCrossReferrals from "../assets/images/hero-cross-referrals.png";
import heroAnalytics from "../assets/images/hero-analytics.png";
import heroSmartReports from "../assets/images/hero-smart-reports.png";

const APP_VERSION = "v2.0.0";

const modules = [
  {
    icon: FlaskConical,
    name: "Dialab",
    tagline: "Diagnostic & Pathology Lab",
    description: "End-to-end lab management from patient walk-in to report delivery. AI-powered report summaries, barcode-based sample tracking, test packages, online booking, and automated billing - all designed to cut turnaround time by half.",
    highlights: ["AI Report Summaries", "Sample Tracking", "Online Booking", "Test Packages", "Cross-Module Referrals"],
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Stethoscope,
    name: "Doclab",
    tagline: "OP Consultations & Inpatient Care",
    description: "Complete hospital management - from OP token queues and AI-powered consultation recording to inpatient admissions, ward/bed management, and real-time ICU monitoring with critical vitals alerts. Send prescriptions directly to pharmacy or refer patients for lab tests in one click.",
    highlights: ["AI Consultation Listener", "Inpatient & ICU", "Cross-Module Referrals", "Patient Portal", "Ward & Bed Mgmt"],
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Pill,
    name: "Medlab",
    tagline: "Pharmacy & Dispensary",
    description: "Smart pharmacy POS with camera-based medicine identification - just photograph any medicine strip to instantly identify and add it. Barcode scanning, AI drug interaction warnings, supplier management, online pharmacy portal, and unified customer tracking across all channels.",
    highlights: ["Camera Medicine ID", "Drug Interaction AI", "Online Pharmacy", "Customer Tracking", "Barcode Scanning"],
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const platformFeatures = [
  {
    icon: Send,
    title: "Cross-Module Referrals",
    description: "Doctors send prescriptions to pharmacy or refer patients for lab tests in one click. Track every referral from sent to completed across modules.",
  },
  {
    icon: Users,
    title: "Smart Patient Management",
    description: "UUID-based patient IDs, AI duplicate detection, family grouping, and instant phone lookup. One patient record flows seamlessly across all three modules.",
  },
  {
    icon: Receipt,
    title: "Unified POS Billing",
    description: "Generate invoices in seconds across diagnostics, consultations, and pharmacy. Print, download, share via WhatsApp, and track all payments in one place.",
  },
  {
    icon: Brain,
    title: "AI at Every Step",
    description: "Consultation transcription, medicine suggestions, report summaries, billing anomaly detection, drug interaction checks, and camera-based medicine identification.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Unified dashboard with module-specific filtering. Track revenue, patients, top tests, doctors, medicines, and customer activity across your entire operation.",
  },
  {
    icon: ShieldCheck,
    title: "Staff & Access Control",
    description: "Granular role-based permissions - admin, doctor, pharmacist, technician, and more. Control module access and page-level visibility per staff member.",
  },
];

const aiFeatures = [
  {
    icon: Mic,
    title: "AI Consultation Listener",
    description: "Record doctor-patient conversations in any language. Get instant transcription, AI-generated diagnosis, treatment plans, and medicine suggestions - hands free.",
  },
  {
    icon: Camera,
    title: "Camera Medicine Identification",
    description: "Photograph any medicine strip, box, or label. AI instantly extracts name, dosage, manufacturer, batch number, expiry, and MRP. Works in pharmacy inventory and POS billing.",
  },
  {
    icon: AlertTriangle,
    title: "Drug Interaction Warnings",
    description: "Real-time AI checks for dangerous drug interactions when prescribing or dispensing. Protects patients and reduces liability for your practice.",
  },
  {
    icon: FileText,
    title: "Smart Report Generation",
    description: "AI-powered patient-friendly report summaries with your custom branding, letterhead, and professional formatting. Patients understand their results better.",
  },
  {
    icon: Sparkles,
    title: "Intelligent Suggestions",
    description: "AI recommends tests based on symptoms, suggests medicines during consultations, detects billing anomalies, and identifies stock patterns.",
  },
  {
    icon: Activity,
    title: "Stock & Demand Insights",
    description: "AI-driven inventory analysis with demand forecasting, reorder recommendations, expiry alerts, and supplier performance tracking to prevent stockouts.",
  },
];

const advancedCapabilities = [
  {
    icon: BedDouble,
    title: "Inpatient & ICU Management",
    description: "Ward and bed management with visual grid, patient admissions, discharges, transfers, and real-time ICU vitals monitoring with critical alerts.",
  },
  {
    icon: Calendar,
    title: "Online Booking Portal",
    description: "Public portal for patients to book consultations with configurable time slots, department selection, and live queue tracking.",
  },
  {
    icon: Globe,
    title: "Patient Portal",
    description: "Patients verify by phone to view consultations, prescriptions, lab reports, and track their queue position online - no app install needed.",
  },
  {
    icon: Building2,
    title: "Multi-Branch Operations",
    description: "Manage multiple branches from one platform. Per-branch booking slots, inventory, staff, branding, and centralized reporting.",
  },
  {
    icon: ScanBarcode,
    title: "Barcode & Camera Scanning",
    description: "Built-in barcode scanner for medicines plus camera-based AI identification. Scan or photograph - both work instantly at the pharmacy counter.",
  },
  {
    icon: ClipboardList,
    title: "Prescription Management",
    description: "Create, edit, print PDF, and share prescriptions via WhatsApp. Send directly to pharmacy for dispensing with one click.",
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description: "Upload your logo, set brand colors, customize report headers/footers, add UPI QR codes, and personalize invoice prefixes.",
  },
  {
    icon: Smartphone,
    title: "Mobile Responsive",
    description: "Fully optimized for tablets and smartphones. Manage your practice on the go from any device, anywhere.",
  },
  {
    icon: Boxes,
    title: "Inventory Management",
    description: "Track reagents, medicines, and supplies with automated low-stock alerts, expiry tracking, and supplier order management.",
  },
  {
    icon: UserPlus,
    title: "Affiliate Program",
    description: "Refer other healthcare providers and earn rewards. Built-in affiliate tracking and commission management.",
  },
];

const benefits = [
  "60 Days Free Trial",
  "No credit card required",
  "Secure healthcare data",
  "All 3 modules included",
  "Works on any device",
];

const heroSlides = [
  {
    image: heroImage,
    badge: "AI-Powered Software Platform for Healthcare Centers",
    badgeIcon: Brain,
    headline: "Your Lab. Your Clinic. Your Pharmacy.",
    highlightText: "All Connected.",
    description: "Stop juggling multiple systems. Diolab unifies diagnostics, OP consultations with inpatient care, and pharmacy into one AI-powered platform built for Indian healthcare providers.",
  },
  {
    image: heroAiConsultation,
    badge: "AI Feature",
    badgeIcon: Mic,
    headline: "AI Consultation Listener.",
    highlightText: "Hands-Free Intelligence.",
    description: "Record doctor-patient conversations in any language. Get instant transcription, AI-generated diagnosis, treatment plans, and medicine suggestions - all while you focus on the patient.",
  },
  {
    image: heroCameraMedicine,
    badge: "AI Feature",
    badgeIcon: Camera,
    headline: "Photograph Any Medicine.",
    highlightText: "Instant Identification.",
    description: "Just point your camera at any medicine strip, box, or label. AI instantly extracts name, dosage, manufacturer, batch number, expiry date, and MRP. Works in inventory and POS billing.",
  },
  {
    image: heroCrossReferrals,
    badge: "Cross-Module Power",
    badgeIcon: Send,
    headline: "One Click from Doctor to Pharmacy.",
    highlightText: "Seamless Referrals.",
    description: "Doctors send prescriptions directly to the pharmacy or refer patients for lab tests with a single click. Track every referral from sent to completed across all modules.",
  },
  {
    image: heroAnalytics,
    badge: "Real-Time Insights",
    badgeIcon: BarChart3,
    headline: "Know Your Numbers.",
    highlightText: "Real-Time Analytics.",
    description: "Unified dashboard with module-specific filtering. Track revenue, patients, top tests, top doctors, medicine sales, and customer trends across your entire operation - live.",
  },
  {
    image: heroSmartReports,
    badge: "AI Feature",
    badgeIcon: FileText,
    headline: "Reports Patients Understand.",
    highlightText: "AI-Powered Summaries.",
    description: "AI generates patient-friendly report summaries with your custom branding, letterhead, and professional formatting. Patients leave informed, not confused.",
  },
];

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % heroSlides.length);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
  }, [currentSlide, goToSlide]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      setTimeout(() => setIsTransitioning(false), 700);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <SEO
        title="Diolab - AI-Powered Software Platform for Healthcare Centers"
        description="AI-powered software platform for healthcare centers. Unify diagnostics, OP consultations, inpatient care, and pharmacy into one system. Built for Indian healthcare providers."
        canonical="https://www.diolab.in/"
        ogTitle="Diolab - AI-Powered Software Platform for Healthcare Centers"
        ogDescription="AI-powered software platform for healthcare centers. Unify diagnostics, OP consultations, inpatient care, and pharmacy into one system. Built for Indian healthcare providers."
        ogImage="/diolab-og-image.jpg"
        ogUrl="https://www.diolab.in/"
        twitterCard="summary_large_image"
      />
      <div className="min-h-screen flex flex-col bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src={logoSymbol} alt="Diolab" className="h-9 w-9 object-contain" />
            <span className="text-xl font-semibold">Diolab</span>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex" data-testid="badge-version">{APP_VERSION}</Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <a href="/sign-in">
              <Button variant="ghost" size="sm" className="sm:size-default" data-testid="button-sign-in">
                Sign In
              </Button>
            </a>
            <a href="/sign-up">
              <Button size="sm" className="sm:size-default btn-primary-gradient" data-testid="button-sign-up">
                Sign Up
                <ArrowRight className="h-4 w-4 ml-1 sm:ml-2 hidden sm:inline" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        <section className="relative h-[calc(100vh-4rem)] min-h-[500px] max-h-[800px] overflow-hidden" data-testid="section-hero">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: currentSlide === index ? 1 : 0, zIndex: currentSlide === index ? 1 : 0 }}
              data-testid={`hero-slide-${index}`}
            >
              <img src={slide.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/40" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            </div>
          ))}

          <div className="absolute inset-0 z-10 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl">
                <div className="grid mb-5">
                  {heroSlides.map((slide, index) => {
                    const IconComponent = slide.badgeIcon;
                    const isActive = currentSlide === index;
                    return (
                      <div
                        key={index}
                        className="flex flex-col"
                        style={{
                          gridArea: "1 / 1",
                          opacity: isActive ? 1 : 0,
                          transition: "opacity 800ms cubic-bezier(0.4, 0, 0.2, 1)",
                          pointerEvents: isActive ? "auto" : "none",
                        }}
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/20 self-start mb-4">
                          <IconComponent className="h-4 w-4" />
                          {slide.badge}
                        </div>
                        <h1
                          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3"
                          data-testid="text-hero-headline"
                        >
                          {slide.headline}{" "}
                          <span className="text-gradient">{slide.highlightText}</span>
                        </h1>
                        <p
                          className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mb-5"
                          data-testid="text-hero-description"
                        >
                          {slide.description}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <a href="/sign-up">
                            <Button size="lg" className="w-full sm:w-auto btn-primary-gradient" data-testid="button-get-started">
                              <Zap className="h-5 w-5 mr-2" />
                              Start Free Trial
                            </Button>
                          </a>
                          <a href="#modules">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto backdrop-blur-sm bg-white/5 text-white border-white/30" data-testid="button-explore-modules">
                              Explore Modules
                              <ArrowRight className="h-5 w-5 ml-2" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 transition-colors active-elevate-2"
            data-testid="button-hero-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 transition-colors active-elevate-2"
            data-testid="button-hero-next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" data-testid="hero-slide-indicators">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${currentSlide === index
                    ? "w-8 h-2.5 bg-primary"
                    : "w-2.5 h-2.5 bg-white/40"
                  }`}
                data-testid={`button-slide-indicator-${index}`}
              />
            ))}
          </div>

          <div className="absolute bottom-6 right-6 z-20">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 text-white/70 text-xs">
              <Clock className="h-3 w-3" />
              <span>{currentSlide + 1} / {heroSlides.length}</span>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-12 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-y" data-testid="section-free-trial-banner">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center">
              <div className="flex items-center gap-3" data-testid="banner-free-trial">
                <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Gift className="h-7 w-7 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl font-bold">60 Days Free!</h3>
                  <p className="text-sm text-muted-foreground">All 3 modules included</p>
                </div>
              </div>
              <div className="hidden md:block h-12 w-px bg-border" />
              <div className="flex items-center gap-3" data-testid="banner-feedback">
                <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="h-7 w-7 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold">Chat with Dio</h3>
                  <p className="text-sm text-muted-foreground">Your AI assistant is ready to help</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="py-12 sm:py-20 bg-muted/30" data-testid="section-modules">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <Badge variant="outline" className="mb-4" data-testid="badge-three-modules">3 Modules, 1 Platform</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Choose Your Modules, Run Everything Together</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Diagnostic lab, hospital, pharmacy, or all three - subscribe to what you need.
                Each module works independently, but together they share patients, referrals, and data seamlessly.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {modules.map((mod) => (
                <Card key={mod.name} className="hover-elevate relative overflow-visible" data-testid={`card-module-${mod.name.toLowerCase()}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`h-12 w-12 rounded-xl ${mod.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <mod.icon className={`h-6 w-6 ${mod.color}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold" data-testid={`text-module-name-${mod.name.toLowerCase()}`}>{mod.name}</h3>
                        <p className="text-sm text-muted-foreground" data-testid={`text-module-tagline-${mod.name.toLowerCase()}`}>{mod.tagline}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{mod.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {mod.highlights.map((h) => (
                        <Badge key={h} variant="secondary" className="text-xs" data-testid={`badge-highlight-${h.replace(/\s+/g, "-").toLowerCase()}`}>{h}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20" data-testid="section-platform-features">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <Badge variant="outline" className="mb-4" data-testid="badge-platform">Platform Features</Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Built-In Power Across Every Module</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Cross-module referrals, unified patient records, real-time analytics, and
                granular staff permissions - core capabilities that make your entire operation smarter.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {platformFeatures.map((feature) => (
                <Card key={feature.title} className="hover-elevate border-0 bg-card/50" data-testid={`card-feature-${feature.title.replace(/\s+/g, "-").toLowerCase()}`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20 bg-muted/30" data-testid="section-ai-features">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <Badge variant="outline" className="mb-4" data-testid="badge-ai-powered">
                <Brain className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">AI That Actually Saves You Time</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Not just buzzwords - real AI that listens to consultations, identifies medicines from photos,
                catches dangerous drug interactions, and generates reports your patients can understand.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {aiFeatures.map((feature) => (
                <Card key={feature.title} className="hover-elevate" data-testid={`card-ai-${feature.title.replace(/\s+/g, "-").toLowerCase()}`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20" data-testid="section-advanced">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-12">
              <Badge variant="outline" className="mb-4" data-testid="badge-advanced-capabilities">
                <Sparkles className="h-3 w-3 mr-1" />
                Advanced Capabilities
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Everything Else You Need to Scale</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Inpatient ward management, online booking, patient portal, custom branding,
                multi-branch support, and more - all included out of the box.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {advancedCapabilities.map((feature) => (
                <Card key={feature.title} className="hover-elevate" data-testid={`card-advanced-${feature.title.replace(/\s+/g, "-").toLowerCase()}`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-20 bg-muted/30" data-testid="section-cta">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Run Your Practice Smarter?</h2>
              <p className="text-muted-foreground mb-8">
                Join healthcare providers across India who use Diolab to connect their lab, clinic, and pharmacy
                into one intelligent system. Get started with all three modules free for 60 days - no credit card needed.
              </p>
              <a href="/sign-up">
                <Button size="lg" className="btn-primary-gradient" data-testid="button-start-now">
                  Start Your 60-Day Free Trial
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img src={logoSymbol} alt="Diolab" className="h-8 w-8 object-contain" />
                <span className="font-semibold text-lg">Diolab</span>
                <Badge variant="secondary" className="text-xs" data-testid="badge-footer-version">{APP_VERSION}</Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                AI-powered software platform for healthcare centers in India.
                Three modules - Dialab (diagnostics), Doclab (consultations & inpatient care), and Medlab (pharmacy) -
                unified in one intelligent system with cross-module referrals and real-time analytics.
              </p>
              <div className="mt-4 text-xs text-muted-foreground">
                <p>800 Jubilee, 2nd Floor, Road No. 36, Jubilee Hills, Hyderabad, 500033</p>
                <p className="mt-1">Phone: +91 9160711252, +91 8971690163</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy-policy">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms-and-conditions" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">
                    Terms and Conditions
                  </a>
                </li>
                <li>
                  <a href="/refund-policy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-refund">
                    Refund Policy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="/shipping-policy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-shipping">
                    Shipping Policy
                  </a>
                </li>
                <li>
                  <a href="/affiliates" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-affiliates">
                    Affiliate Program
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <div>
              <p>800 Jubilee, 2nd Floor, Road No. 36, Jubilee Hills, Hyderabad, 500033</p>
              <p className="mt-1">Phone: +91 9160711252, +91 8971690163</p>
              <p className="mt-2">&copy; {new Date().getFullYear()} Diolab. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      <UpdatesPopup />
      <DioChatAssistant />
    </div>
    </>
  );
}
