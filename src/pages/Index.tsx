import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Truck, ShieldCheck, ArrowRight, Leaf, HandHeart } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import heroImage from "@/assets/hero-food-sharing.jpg";

const features = [
  { icon: Heart, title: "Share Food", desc: "Donate surplus food to people in your community who need it most.", step: "01" },
  { icon: MapPin, title: "Find Nearby", desc: "Browse an interactive map to discover available food near you.", step: "02" },
  { icon: Truck, title: "Volunteer Pickups", desc: "Volunteers help deliver food from donors to receivers seamlessly.", step: "03" },
  { icon: ShieldCheck, title: "Trusted Community", desc: "Ratings and reviews build trust between donors, receivers, and volunteers.", step: "04" },
];

const stats = [
  { value: "0kg", label: "Food Saved" },
  { value: "4", label: "Roles Supported" },
  { value: "100%", label: "Free to Use" },
  { value: "∞", label: "Potential Impact" },
];

export default function Index() {
  const { user, role } = useAuth();
  const dashboardPath = role ? `/dashboard/${role}` : "/";
  const ctaLink = user ? dashboardPath : "/signup";
  const ctaText = user ? "Go to Dashboard" : "Get Started";
  const ctaJoinText = user ? "Go to Dashboard" : "Join Now — It's Free";

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero with background image */}
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Community sharing food together"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/75 to-background/60 dark:from-background/95 dark:via-background/85 dark:to-background/70" />
        <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 -right-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="container relative mx-auto flex flex-col items-center gap-8 px-4 py-28 text-center md:py-36">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
            <Leaf className="h-4 w-4" /> Reducing food waste, one meal at a time
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            Reduce Food Waste.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Feed Communities.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
            LeftoverLove connects food donors with people in need through a community-driven platform with real-time maps, volunteer pickups, and trust-based ratings.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/20" asChild>
              <Link to={ctaLink}>{ctaText} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            {!user && (
              <Button size="lg" variant="outline" className="px-8 bg-background/60 backdrop-blur-sm" asChild>
                <Link to="/about">Learn More</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-primary md:text-3xl">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mb-14 text-center">
          <Badge variant="outline" className="mb-3 text-primary border-primary/30">How It Works</Badge>
          <h2 className="text-3xl font-bold md:text-4xl">Four Simple Steps</h2>
          <p className="mt-3 max-w-lg mx-auto text-muted-foreground">A simple, powerful way to reduce food waste in your community.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
              <div className="absolute top-4 right-4 text-4xl font-extrabold text-primary/10 group-hover:text-primary/20 transition-colors">{f.step}</div>
              <CardContent className="flex flex-col items-start gap-4 p-6">
                <div className="rounded-xl bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-muted/30 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-14 text-center">
            <Badge variant="outline" className="mb-3 text-accent border-accent/30">Community</Badge>
            <h2 className="text-3xl font-bold md:text-4xl">Who Can Join?</h2>
            <p className="mt-3 max-w-lg mx-auto text-muted-foreground">Everyone has a role to play in fighting food waste.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🍽️", role: "Donor", desc: "Share surplus food with your community", color: "border-primary/20 hover:border-primary/40" },
              { icon: "🙋", role: "Receiver", desc: "Find and request free food nearby", color: "border-accent/20 hover:border-accent/40" },
              { icon: "🚗", role: "Volunteer", desc: "Help deliver food to those in need", color: "border-secondary/20 hover:border-secondary/40" },
              { icon: "🛡️", role: "Admin", desc: "Moderate and manage the platform", color: "border-muted-foreground/20 hover:border-muted-foreground/40" },
            ].map((r) => (
              <Card key={r.role} className={`text-center transition-all hover:shadow-lg hover:-translate-y-1 border-2 ${r.color}`}>
                <CardContent className="p-8">
                  <div className="mb-4 text-5xl">{r.icon}</div>
                  <h3 className="text-lg font-bold">{r.role}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Mission */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <HandHeart className="mx-auto h-12 w-12 text-primary/60 mb-6" />
          <blockquote className="text-2xl font-medium italic text-foreground/80 md:text-3xl">
            "Every meal shared is a step towards a world where no food goes to waste and no one goes hungry."
          </blockquote>
          <p className="mt-4 text-muted-foreground">— The LeftoverLove Team</p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary/5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
        <div className="container relative mx-auto px-4 py-20 text-center md:py-28">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to Make a Difference?</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Join LeftoverLove today and help build a community where no food goes to waste.
          </p>
          <Button size="lg" className="mt-8 gap-2 px-10 shadow-lg shadow-primary/20" asChild>
            <Link to={ctaLink}>{ctaJoinText} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-10">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/favicon.ico" alt="LeftoverLove" className="h-7 w-7 object-contain" />
            <span className="text-lg font-bold text-foreground">LeftoverLove</span>
          </div>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/browse" className="hover:text-foreground transition-colors">Browse Food</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
          <p>© 2026 LeftoverLove. Built with love to reduce food waste.</p>
        </div>
      </footer>
    </div>
  );
}
