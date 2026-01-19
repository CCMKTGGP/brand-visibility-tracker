"use client";

// Next.js imports
import Link from "next/link";

// Third-party imports
import {
  Building2,
  BarChart3,
  Shield,
  Zap,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  Eye,
  Target,
  Globe,
} from "lucide-react";

// Local imports
import Logo from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * Home Page Component
 *
 * Landing page for the surfacemap.cc application.
 * Features hero section, features showcase, testimonials, pricing, and footer.
 *
 * @returns JSX.Element - The complete landing page
 */
export default function Home() {
  const features = [
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Real-time Analytics",
      description:
        "Track your brand visibility across ChatGPT, Claude, Gemini, and Perplexity with live performance metrics.",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Funnel Analysis",
      description:
        "Monitor TOFU, MOFU, BOFU, and EVFU stages to understand your brand's customer journey impact.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Sentiment Tracking",
      description:
        "Analyze positive, neutral, and negative sentiment trends to optimize your brand positioning.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Collaboration",
      description:
        "Invite team members with role-based access to collaborate on brand visibility strategies.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Competitive Intelligence",
      description:
        "Compare your brand performance against competitors across different AI models.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Automated Monitoring",
      description:
        "Set up automated prompt executions to continuously monitor your brand visibility.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Director",
      company: "TechFlow Inc.",
      content:
        "BrandViz transformed how we understand our AI visibility. We increased our brand mentions by 340% in just 3 months.",
      rating: 5,
    },
    {
      name: "Michael Rodriguez",
      role: "Brand Manager",
      company: "HealthPlus Solutions",
      content:
        "The funnel analysis feature helped us identify gaps in our MOFU strategy. Our conversion rates improved significantly.",
      rating: 5,
    },
    {
      name: "Emily Watson",
      role: "CMO",
      company: "EduLearn Platform",
      content:
        "Finally, a tool that shows us how AI models perceive our brand. The insights are invaluable for our positioning strategy.",
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small businesses getting started",
      features: [
        "1 Brand tracking",
        "Basic analytics",
        "3 AI models",
        "Email support",
        "Monthly reports",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$99",
      period: "/month",
      description: "Ideal for growing companies",
      features: [
        "5 Brands tracking",
        "Advanced analytics",
        "All AI models",
        "Priority support",
        "Real-time alerts",
        "Team collaboration",
        "Custom reports",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations",
      features: [
        "Unlimited brands",
        "Custom integrations",
        "Dedicated support",
        "Advanced security",
        "Custom AI models",
        "White-label options",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Pricing
              </a>
              <a
                href="#testimonials"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Testimonials
              </a>
              <Link
                href="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/80 transition-colors"
              >
                Get Started
              </Link>
              <ModeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Track Your Brand&apos;s
              <span className="text-accent block">AI Visibility</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Monitor how ChatGPT, Claude, Gemini, and Perplexity perceive your
              brand. Get actionable insights to improve your visibility across
              AI models and drive better business outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/80 transition-colors inline-flex items-center justify-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-indigo-900 dark:to-blue-900 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      TechCorp
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Technology
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      85%
                    </div>
                    <div className="bg-yellow-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      72%
                    </div>
                    <div className="bg-orange-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      68%
                    </div>
                    <div className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      91%
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +12% this month
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      HealthPlus
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Healthcare
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-yellow-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      78%
                    </div>
                    <div className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      81%
                    </div>
                    <div className="bg-yellow-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      75%
                    </div>
                    <div className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      83%
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +8% this month
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      EduLearn
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Education
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      92%
                    </div>
                    <div className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      88%
                    </div>
                    <div className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      85%
                    </div>
                    <div className="bg-yellow-500 h-8 rounded flex items-center justify-center text-white text-xs font-bold">
                      79%
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +15% this month
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need to track AI visibility
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Comprehensive tools to monitor, analyze, and optimize your
              brand&apos;s presence across AI models.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="text-accent dark:text-accent mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-accent dark:text-accent mb-2">
                500+
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Brands Tracked
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent dark:text-accent mb-2">
                1M+
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Prompts Analyzed
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent dark:text-accent mb-2">
                98%
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                Accuracy Rate
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent dark:text-accent mb-2">
                24/7
              </div>
              <div className="text-gray-600 dark:text-gray-300">Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by leading brands
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See what our customers are saying about BrandViz
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6 italic">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {testimonial.role}
                  </div>
                  <div className="text-sm text-accent dark:text-accent">
                    {testimonial.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Choose the plan that&apos;s right for your business
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border-2 ${
                  plan.popular
                    ? "border-accent relative"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    {plan.description}
                  </p>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-center block transition-colors ${
                    plan.popular
                      ? "bg-primary text-white hover:bg-primary/80"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-accent">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to track your brand&apos;s AI visibility?
          </h2>
          <p className="text-xl text-gray-100 mb-8">
            Join hundreds of brands already using BrandViz to optimize their AI
            presence.
          </p>
          <Link
            href="/signup"
            className="bg-white text-accent px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <p className="text-gray-100 mt-4 text-sm">
            14-day free trial • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building2 className="h-8 w-8 text-accent" />
                <span className="ml-2 text-2xl font-bold">BrandViz</span>
              </div>
              <p className="text-gray-400 mb-4">
                Track your brand&apos;s visibility across AI models and optimize
                your digital presence.
              </p>
              <div className="flex space-x-4">
                <Globe className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Eye className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
                <Target className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Status
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} BrandViz. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
