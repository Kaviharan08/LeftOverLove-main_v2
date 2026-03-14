import { Navbar } from "@/components/Navbar";
import { Heart, Target, Users, Globe, Leaf, HandHeart, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const values = [
  { icon: Target, title: "Our Mission", desc: "To eliminate food waste and hunger in local communities by making food sharing easy, safe, and accessible to everyone." },
  { icon: Users, title: "Community First", desc: "Built on trust and transparency — every user is verified, and ratings help maintain a safe sharing environment." },
  { icon: Globe, title: "Local Impact", desc: "We focus on hyperlocal connections, so shared food reaches people quickly while it's still fresh." },
  { icon: Heart, title: "Made with Love", desc: "LeftoverLove is a passion project built to prove that technology can solve real-world problems in our neighborhoods." },
];

const principles = [
  { icon: Leaf, title: "Sustainability", desc: "Reducing food waste is one of the most impactful ways to fight climate change." },
  { icon: HandHeart, title: "Generosity", desc: "We believe in the power of giving — every meal shared creates a ripple of kindness." },
  { icon: Shield, title: "Safety", desc: "Our rating system and moderation tools ensure a trusted, safe platform for all." },
];

export default function About() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-accent/5">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">About Us</Badge>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Fighting Food Waste,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Together</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              We believe no food should go to waste while people go hungry. LeftoverLove is a community-driven
              platform connecting food donors with those in need, powered by dedicated volunteers.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-10 text-center text-3xl font-bold">What We Stand For</h2>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {values.map((item) => (
            <Card key={item.title} className="group transition-all hover:shadow-lg hover:-translate-y-1">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="w-fit rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-10 text-center text-3xl font-bold">Our Guiding Principles</h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="flex flex-col items-center text-center gap-3">
                <div className="rounded-full bg-primary/10 p-4">
                  <p.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold">Join the Movement</h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Whether you want to share food, receive meals, or volunteer your time — there's a place for you.
        </p>
        <Button size="lg" className="mt-8 px-10" asChild>
          <Link to="/signup">Get Started</Link>
        </Button>
      </section>
    </div>
  );
}
