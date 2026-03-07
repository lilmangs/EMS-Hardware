import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login } from '@/routes';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart3,
    Boxes,
    Home,
    Info,
    Mail,
    MapPin,
    Phone,
    ScanBarcode,
    ShoppingCart,
    Store,
    Truck,
    Wrench,
} from 'lucide-react';

export default function Welcome() {
    const { auth } = usePage().props;

    const heroBackgroundImage =
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80';

    useEffect(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-lp-reveal]'));
        if (elements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        (entry.target as HTMLElement).classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.15 }
        );

        for (const el of elements) observer.observe(el);

        return () => observer.disconnect();
    }, []);

    return (
        <>
            <Head title="EM's Hardware - Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-background font-sans text-foreground">

                {/* Navbar */}
                <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center h-16">
                            <div className="flex flex-1 items-center">
                                <Link href="/" className="flex items-center gap-2.5">
                                  <img 
                                   src="/ems-logo.png" 
                                   alt="EM's Hardware Logo" 
                                   className="h-7 w-auto md:h-8" 
                                  />
                                  <span className="text-lg font-semibold tracking-tight">
                                    EM's Hardware
                                  </span>
                                </Link>
                            </div>
                            <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
                                <Link href="#hero" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
                                <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
                                <Link href="#services" className="text-sm text-muted-foreground hover:text-foreground">Services</Link>
                            </div>
                            <div className="flex flex-1 items-center justify-end gap-3">
                                {auth.user ? (
                                    <Button asChild size="sm">
                                        <Link href={dashboard()}>Dashboard</Link>
                                    </Button>
                                ) : (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <header id="hero" className="relative overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-100"
                        style={{
                            backgroundImage: `url(/images/bg.jpg)`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                        aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background/80" />
                    

                    <div className="relative max-w-7xl mx-auto px-6 py-20 sm:py-24">
                        <div className="grid items-center gap-10 lg:grid-cols-2">
                            <div className="text-center lg:text-left">
                                <Badge className="mb-6 lp-gradient-orange-brown text-white">POS • Inventory • Delivery</Badge>
                                <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
                                    <span className="lp-gradient-text-orange-brown">Sell faster. Track inventory.</span>
                                    <span className="block text-foreground">Deliver with confidence.</span>
                                </h1>
                                <p className="mt-6 text-lg md:text-xl text-foreground max-w-2xl mx-auto lg:mx-0">
                                    EM's Hardware Point-of-Sale & Inventory Management System built for multi-branch operations.
                                </p>

                                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                                    {auth.user ? (
                                        <>
                                            <Button asChild size="lg" className="lp-gradient-orange-brown text-white hover:opacity-90">
                                                <Link href={dashboard()}>Open Dashboard</Link>
                                            </Button>
                                            <Button asChild size="lg" variant="outline">
                                                <Link href="#services">See Services</Link>
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button asChild size="lg">
                                                <Link href={login()}>Log in</Link>
                                            </Button>
                                            <Button asChild size="lg" variant="outline">
                                                <Link href="#services">Explore Features</Link>
                                            </Button>
                                        </>
                                    )}
                                </div>

                                <div className="mt-10 flex flex-wrap gap-2 justify-center lg:justify-start">
                                    <Badge variant="outline">Real-time stock</Badge>
                                    <Badge variant="outline">Low-stock alerts</Badge>
                                    <Badge variant="outline">Sales reports</Badge>
                                    <Badge variant="outline">Multi-branch</Badge>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="lp-float lp-float--slow absolute -top-6 -left-4 hidden sm:block">
                                    <Badge variant="secondary">+ Accurate inventory</Badge>
                                </div>
                                <div className="lp-float absolute -bottom-6 -right-2 hidden sm:block">
                                    <Badge variant="secondary">+ Faster checkout</Badge>
                                </div>

                                <Card className="relative overflow-hidden">
                                    <CardHeader className="gap-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">Today’s Snapshot</CardTitle>
                                            <Badge variant="outline">Live</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">A quick view of what matters right now.</p>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="rounded-lg border bg-background/60 p-4">
                                                <div className="text-sm text-muted-foreground">Sales</div>
                                                <div className="mt-2 text-2xl font-semibold">₱12.4k</div>
                                                <div className="mt-1 text-xs text-muted-foreground">Today</div>
                                            </div>
                                            <div className="rounded-lg border bg-background/60 p-4">
                                                <div className="text-sm text-muted-foreground">Orders</div>
                                                <div className="mt-2 text-2xl font-semibold">48</div>
                                                <div className="mt-1 text-xs text-muted-foreground">Processed</div>
                                            </div>
                                            <div className="rounded-lg border bg-background/60 p-4">
                                                <div className="text-sm text-muted-foreground">Low Stock</div>
                                                <div className="mt-2 text-2xl font-semibold">6</div>
                                                <div className="mt-1 text-xs text-muted-foreground">Items</div>
                                            </div>
                                        </div>

                                        <div className="mt-6 grid gap-2">
                                            <div className="flex items-center justify-between rounded-lg border bg-background/60 px-4 py-3">
                                                <div className="text-sm">
                                                    <span className="font-medium">Cement</span>
                                                    <span className="text-muted-foreground"> · stock alert</span>
                                                </div>
                                                <Badge variant="destructive">Low</Badge>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg border bg-background/60 px-4 py-3">
                                                <div className="text-sm">
                                                    <span className="font-medium">Delivery</span>
                                                    <span className="text-muted-foreground"> · 3 active</span>
                                                </div>
                                                <Badge variant="secondary">On route</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Branches */}
                <section className="py-18 sm:py-20">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <Badge variant="secondary" className="mb-4">Locations</Badge>
                            <h2 className="text-3xl sm:text-4xl font-bold">Our Branches</h2>
                            <p className="mt-3 text-lg text-muted-foreground">
                                Visit your nearest branch or manage all locations in one system.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-2">
                            {[
                                {
                                    name: "Lagonglong",
                                    desc: "Main branch location",
                                    meta: "Main",
                                    hours: "8:00 AM – 6:00 PM",
                                },
                                {
                                    name: "Balingasag",
                                    desc: "Secondary branch location",
                                    meta: "Branch",
                                    hours: "8:00 AM – 6:00 PM",
                                },
                            ].map((branch, i) => (
                                <Card
                                    key={branch.name}
                                    data-lp-reveal
                                    style={{ transitionDelay: `${i * 90}ms` }}
                                    className="lp-reveal relative overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    <CardHeader className="gap-2">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-2xl flex items-center gap-2">
                                                    <MapPin className="h-5 w-5 text-primary" />
                                                    {branch.name}
                                                </CardTitle>
                                                <p className="mt-1 text-sm text-muted-foreground">{branch.desc}</p>
                                            </div>
                                            <Badge variant="outline">{branch.meta}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-3">
                                            <div className="flex items-center justify-between rounded-lg border bg-background/60 px-4 py-3">
                                                <div className="text-sm text-muted-foreground">Store Hours</div>
                                                <div className="text-sm font-medium">{branch.hours}</div>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg border bg-background/60 px-4 py-3">
                                                <div className="text-sm text-muted-foreground">Coverage</div>
                                                <div className="text-sm font-medium">Walk-in • Delivery</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Key Features */}
                <section className="py-20 bg-muted/40">
                    <div className="max-w-7xl mx-auto px-6">
                        <h2 className="text-4xl font-bold text-center mb-16">Key Features</h2>

                        <div className="lp-card-marquee" aria-label="Features">
                            <div className="lp-card-marquee__track">
                                {[...Array(2)].flatMap((_, loopIndex) =>
                                    [
                                        { icon: ShoppingCart, title: "Point of Sales", desc: "Fast checkout with real-time tracking" },
                                        { icon: Boxes, title: "Inventory Management", desc: "Stock levels, alerts" },
                                        { icon: Truck, title: "Delivery Tracking", desc: "Monitor status & improve delivery" },
                                        { icon: BarChart3, title: "Sales Reports", desc: "Detailed daily/weekly/monthly insights" },
                                        { icon: Store, title: "Multi-Branch Support", desc: "Centralized management for all stores" },
                                        { icon: ScanBarcode, title: "Barcode Integration", desc: "Quick scanning for efficiency" },
                                    ].map((f, i) => (
                                        <Card
                                            key={`${loopIndex}-${i}`}
                                            className="lp-card-marquee__card hover:shadow-md transition-shadow"
                                        >
                                            <CardHeader className="gap-3">
                                                <f.icon className="h-10 w-10 text-primary" />
                                                <CardTitle className="text-xl">{f.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-muted-foreground">{f.desc}</p>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section id="about" className="py-20">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                            <div data-lp-reveal className="lp-reveal">
                                <Badge className="mb-5 lp-gradient-orange-pink text-white">About</Badge>
                                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">About EM's Hardware</h2>
                                <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
                                    Serving Misamis Oriental for over 5 years with quality hardware, tools, paints, and construction materials.
                                    We combine trusted in-store service with modern systems that keep every branch fast and accurate.
                                </p>
                                <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
                                    From cashier to inventory to delivery, our workflow is designed to reduce mistakes, prevent stock issues, and help you make smarter decisions.
                                </p>

                                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                    <Card className="hover:shadow-md transition-shadow">
                                        <CardHeader className="gap-2">
                                            <ShoppingCart className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">Faster checkout</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Less waiting, clearer receipts, smoother cashier flow.</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="hover:shadow-md transition-shadow">
                                        <CardHeader className="gap-2">
                                            <Boxes className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">Accurate inventory</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Real-time stock updates across branches.</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="hover:shadow-md transition-shadow">
                                        <CardHeader className="gap-2">
                                            <Truck className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">Delivery tracking</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Know what’s out for delivery and what’s completed.</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="hover:shadow-md transition-shadow">
                                        <CardHeader className="gap-2">
                                            <BarChart3 className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-base">Smarter reporting</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Sales insights you can act on every day.</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div data-lp-reveal className="lp-reveal">
                                <Card className="overflow-hidden p-0">
                                    <div className="relative aspect-[4/3]">
                                        <img
                                            src="https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?auto=format&fit=crop&q=80"
                                            alt="Hardware store"
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                                        <div className="absolute left-5 bottom-5 right-5 grid gap-3 sm:grid-cols-3">
                                            <Card className="bg-background/70 backdrop-blur">
                                                <CardHeader className="py-4">
                                                    <CardTitle className="text-sm">Multi-branch</CardTitle>
                                                </CardHeader>
                                            </Card>
                                            <Card className="bg-background/70 backdrop-blur">
                                                <CardHeader className="py-4">
                                                    <CardTitle className="text-sm">Cloud-ready</CardTitle>
                                                </CardHeader>
                                            </Card>
                                            <Card className="bg-background/70 backdrop-blur">
                                                <CardHeader className="py-4">
                                                    <CardTitle className="text-sm">Role-based</CardTitle>
                                                </CardHeader>
                                            </Card>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section id="services" className="py-20 bg-muted/20">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <h2 className="text-4xl font-bold mb-4">Our Services</h2>
                        <p className="text-xl text-muted-foreground mb-16 max-w-3xl mx-auto">
                            Modern tools built specifically for hardware businesses.
                        </p>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { title: "POS & Cashier System", desc: "Quick billing, receipt printing" },
                                { title: "Inventory & Stock Control", desc: "Real-time tracking, low-stock alerts" },
                                { title: "Delivery Management", desc: "Scheduling, rider assignment" },
                            ].map((s, i) => (
                                <Card key={i} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="text-2xl">{s.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{s.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t bg-muted/30">
                    <div className="max-w-7xl mx-auto px-6 py-16">
                        <div className="grid md:grid-cols-4 gap-10">
                            <div>
                                <h3 className="text-2xl font-semibold mb-6">EM's Hardware</h3>
                                <p className="text-muted-foreground">
                                    Smarter tools for your hardware business.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-4">Quick Links</h4>
                                <ul className="space-y-3">
                                    <li><Link href="/" className="flex items-start gap-2 text-muted-foreground hover:text-foreground"><Home className="mt-0.5 h-4 w-4" />Home</Link></li>
                                    <li><Link href="#about" className="flex items-start gap-2 text-muted-foreground hover:text-foreground"><Info className="mt-0.5 h-4 w-4" />About</Link></li>
                                    <li><Link href="#services" className="flex items-start gap-2 text-muted-foreground hover:text-foreground"><Wrench className="mt-0.5 h-4 w-4" />Services</Link></li>
                                    <li><Link href={dashboard()} className="flex items-start gap-2 text-muted-foreground hover:text-foreground"><BarChart3 className="mt-0.5 h-4 w-4" />Dashboard</Link></li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-4">Branches</h4>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2 text-muted-foreground"><Store className="mt-0.5 h-4 w-4" />Lagonglong (Main)</li>
                                    <li className="flex items-start gap-2 text-muted-foreground"><Store className="mt-0.5 h-4 w-4" />Balingasag</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-4">Contact</h4>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2 text-muted-foreground">
                                        <Phone className="mt-0.5 h-4 w-4" />
                                        <span>(088) 123-4567</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-muted-foreground">
                                        <Mail className="mt-0.5 h-4 w-4" />
                                        <span>info@emshardware.ph</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-muted-foreground">
                                        <MapPin className="mt-0.5 h-4 w-4" />
                                        <span>Misamis Oriental, Philippines</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
                            © {new Date().getFullYear()} EM's Hardware. All rights reserved.
                        </div>
                    </div>
                </footer>

            </div>
        </>
    );
}