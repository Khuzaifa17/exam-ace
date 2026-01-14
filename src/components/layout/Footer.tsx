import { Link } from 'react-router-dom';
import { BookOpen, Mail, Phone } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold">
                Pak<span className="text-primary">Test</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Pakistan's premier competitive exam preparation platform. Practice with thousands of MCQs, take mock tests, and track your progress.
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href="mailto:support@paktest.pk" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="h-4 w-4" />
                support@paktest.pk
              </a>
              <a href="tel:+923001234567" className="flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-4 w-4" />
                +92 300 1234567
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/exams" className="text-muted-foreground hover:text-primary transition-colors">
                  All Exams
                </Link>
              </li>
              <li>
                <Link to="/practice" className="text-muted-foreground hover:text-primary transition-colors">
                  Practice Mode
                </Link>
              </li>
              <li>
                <Link to="/mock" className="text-muted-foreground hover:text-primary transition-colors">
                  Mock Tests
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PakTest Prep. Made with 💚 in Pakistan.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              🇵🇰 Proudly Pakistani
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
