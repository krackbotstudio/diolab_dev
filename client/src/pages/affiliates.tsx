import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Share2,
  Check,
  Gift,
  Zap,
  Shield,
  BarChart3,
  Wallet,
  Link as LinkIcon,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const affiliateFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  company: z.string().optional(),
  website: z.string().optional(),
  experience: z.string().optional(),
  audience: z.string().optional(),
});

type AffiliateFormValues = z.infer<typeof affiliateFormSchema>;

export default function Affiliates() {
  const { toast } = useToast();
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(affiliateFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      website: "",
      experience: "",
      audience: "",
    },
  });

  const affiliateCode = "PARTNER2026";
  const referralLink = `https://diolab.in/signup?ref=${affiliateCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copied",
      description: "Your referral link has been copied to clipboard.",
    });
  };

  const onSubmit = async (data: AffiliateFormValues) => {
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("Affiliate application submitted:", data);
    
    toast({
      title: "Application submitted!",
      description: "We'll review your application and get back to you within 48 hours.",
    });
    
    setIsSignUpOpen(false);
    setIsSubmitting(false);
    form.reset();
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Generous Commissions",
      description: "Earn up to 30% recurring commission on every successful referral for the lifetime of the customer.",
    },
    {
      icon: TrendingUp,
      title: "Passive Income",
      description: "Build a steady stream of income as your referrals continue using Diolab month after month.",
    },
    {
      icon: Zap,
      title: "Quick Payouts",
      description: "Get paid monthly via bank transfer or UPI. No minimum threshold required.",
    },
    {
      icon: Gift,
      title: "Exclusive Perks",
      description: "Top affiliates get access to premium features, early access to new products, and special bonuses.",
    },
    {
      icon: Shield,
      title: "Dedicated Support",
      description: "Get a dedicated affiliate manager to help you succeed and maximize your earnings.",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track your referrals, conversions, and earnings in real-time with our affiliate dashboard.",
    },
  ];

  const commissionTiers = [
    { tier: "Bronze", referrals: "1-10", rate: "20%", bonus: "-" },
    { tier: "Silver", referrals: "11-25", rate: "25%", bonus: "₹5,000" },
    { tier: "Gold", referrals: "26-50", rate: "28%", bonus: "₹15,000" },
    { tier: "Platinum", referrals: "50+", rate: "30%", bonus: "₹50,000" },
  ];

  const sampleEarnings = [
    { date: "Jan 15, 2026", referral: "City Diagnostics", plan: "Professional", commission: "₹2,400" },
    { date: "Jan 12, 2026", referral: "HealthFirst Labs", plan: "Enterprise", commission: "₹4,800" },
    { date: "Jan 08, 2026", referral: "Quick Test Center", plan: "Starter", commission: "₹600" },
    { date: "Jan 03, 2026", referral: "MedLab Solutions", plan: "Professional", commission: "₹2,400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">Diolab Affiliate Program</h1>
              <p className="text-xs text-muted-foreground">Earn by sharing Diolab</p>
            </div>
          </div>
          <Button onClick={() => setIsSignUpOpen(true)} data-testid="button-join-affiliate">
            Join Now
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4" variant="outline">
            <Gift className="h-3 w-3 mr-1" />
            Affiliate Program
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="heading-hero-title">
            Earn Money by Sharing
            <span className="text-primary block mt-1">Diolab</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-hero-description">
            Join our affiliate program and earn up to 30% recurring commission for every diagnostic center you refer. 
            Help healthcare providers modernize their operations while building your passive income.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => setIsSignUpOpen(true)} data-testid="button-become-affiliate">
              <Users className="h-4 w-4 mr-2" />
              Become an Affiliate
            </Button>
            <Button variant="outline" size="lg" onClick={handleCopyLink} data-testid="button-copy-referral">
              <Copy className="h-4 w-4 mr-2" />
              Copy Referral Link
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4 bg-card/50 border-y">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div data-testid="stat-active-affiliates">
            <p className="text-3xl font-bold text-primary">500+</p>
            <p className="text-sm text-muted-foreground">Active Affiliates</p>
          </div>
          <div data-testid="stat-total-paidout">
            <p className="text-3xl font-bold text-primary">₹50L+</p>
            <p className="text-sm text-muted-foreground">Total Paid Out</p>
          </div>
          <div data-testid="stat-max-commission">
            <p className="text-3xl font-bold text-primary">30%</p>
            <p className="text-sm text-muted-foreground">Max Commission</p>
          </div>
          <div data-testid="stat-payout-time">
            <p className="text-3xl font-bold text-primary">48hrs</p>
            <p className="text-sm text-muted-foreground">Avg. Payout Time</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="heading-benefits">Why Join Our Affiliate Program?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover-elevate" data-testid={`card-benefit-${index}`}>
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="py-16 px-4 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="heading-commission-structure">Commission Structure</h2>
          <Card>
            <CardContent className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Tier</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Bonus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionTiers.map((tier, index) => (
                    <TableRow key={index} data-testid={`row-tier-${index}`}>
                      <TableCell>
                        <Badge variant={index === 3 ? "default" : "outline"}>
                          {tier.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>{tier.referrals}</TableCell>
                      <TableCell className="font-semibold text-primary">{tier.rate}</TableCell>
                      <TableCell>{tier.bonus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-4" data-testid="text-commission-note">
            Commissions are paid monthly. Recurring commissions continue for the lifetime of the referred customer.
          </p>
        </div>
      </section>

      {/* Demo Dashboard */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2" data-testid="heading-dashboard-preview">Affiliate Dashboard Preview</h2>
          <p className="text-muted-foreground text-center mb-8" data-testid="text-dashboard-description">
            Get real-time insights into your referrals and earnings
          </p>
          
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="referrals" data-testid="tab-referrals">Referrals</TabsTrigger>
              <TabsTrigger value="payouts" data-testid="tab-payouts">Payouts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <LinkIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Clicks</p>
                        <p className="text-2xl font-bold">1,247</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                        <p className="text-2xl font-bold">42</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conv. Rate</p>
                        <p className="text-2xl font-bold">3.4%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Earned</p>
                        <p className="text-2xl font-bold">₹45,600</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Referral Link</CardTitle>
                  <CardDescription>Share this link to earn commissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="font-mono text-sm" data-testid="input-referral-link" />
                    <Button onClick={handleCopyLink} data-testid="button-copy-link">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" data-testid="button-share-link">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrals">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Referral</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleEarnings.map((earning, index) => (
                        <TableRow key={index} data-testid={`row-earning-${index}`}>
                          <TableCell className="text-muted-foreground">{earning.date}</TableCell>
                          <TableCell className="font-medium">{earning.referral}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{earning.plan}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {earning.commission}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payout History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { date: "Jan 01, 2026", amount: "₹12,400", status: "Paid" },
                      { date: "Dec 01, 2025", amount: "₹8,200", status: "Paid" },
                      { date: "Nov 01, 2025", amount: "₹15,000", status: "Paid" },
                    ].map((payout, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50" data-testid={`card-payout-${index}`}>
                        <div>
                          <p className="font-medium">{payout.amount}</p>
                          <p className="text-sm text-muted-foreground">{payout.date}</p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <Check className="h-3 w-3 mr-1" />
                          {payout.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8" data-testid="heading-how-it-works">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center" data-testid="step-1">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Sign Up</h3>
              <p className="text-sm text-muted-foreground">
                Apply to become an affiliate. We review applications within 48 hours.
              </p>
            </div>
            <div className="text-center" data-testid="step-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Share Your Link</h3>
              <p className="text-sm text-muted-foreground">
                Get your unique referral link and share it with diagnostic centers.
              </p>
            </div>
            <div className="text-center" data-testid="step-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Earn Commission</h3>
              <p className="text-sm text-muted-foreground">
                Get paid every month for as long as your referrals stay subscribed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4" data-testid="heading-cta">Ready to Start Earning?</h2>
          <p className="text-muted-foreground mb-6" data-testid="text-cta-description">
            Join hundreds of affiliates who are already earning with Diolab. 
            No upfront costs, no hidden fees.
          </p>
          <Button size="lg" onClick={() => setIsSignUpOpen(true)} data-testid="button-start-earning">
            <ChevronRight className="h-4 w-4 mr-2" />
            Apply Now - It's Free
          </Button>
        </div>
      </section>

      {/* Sign Up Dialog */}
      <Dialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Join the Affiliate Program</DialogTitle>
            <DialogDescription>
              Fill out the form below to apply. We'll review your application within 48 hours.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-affiliate-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-affiliate-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} data-testid="input-affiliate-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-affiliate-company" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website / Social Media</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-affiliate-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relevant Experience</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your experience in healthcare or affiliate marketing..."
                        rows={3}
                        {...field}
                        data-testid="input-affiliate-experience"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Audience</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your audience and how you plan to promote Diolab..."
                        rows={3}
                        {...field}
                        data-testid="input-affiliate-audience"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSignUpOpen(false)} data-testid="button-cancel-affiliate">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit-affiliate">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Application
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p data-testid="text-contact-email">Have questions? Contact us at <a href="mailto:connect@diolab.in">connect@diolab.in</a></p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/privacy-policy">
              <span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-privacy">Privacy Policy</span>
            </Link>
            <Link href="/terms-and-conditions">
              <span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-footer-terms">Terms & Conditions</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
