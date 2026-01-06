import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
              <span className="font-display text-xl font-semibold">LendPro Cart</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Modern e-commerce platform with intelligent financing, upselling, and warranty solutions.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/products?category=mattresses" className="text-sm text-muted-foreground hover:text-foreground">
                  Mattresses
                </Link>
              </li>
              <li>
                <Link to="/products?category=bedding" className="text-sm text-muted-foreground hover:text-foreground">
                  Bedding
                </Link>
              </li>
              <li>
                <Link to="/products?category=furniture" className="text-sm text-muted-foreground hover:text-foreground">
                  Furniture
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Shipping Info
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Returns
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Financing Terms
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Warranty Info
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LendPro Cart. All rights reserved.
          </p>
          <div className="flex items-center space-x-6">
            <span className="text-sm text-muted-foreground">Payment Partners:</span>
            <div className="flex items-center space-x-4">
              <span className="text-xs font-medium px-2 py-1 bg-muted rounded">Stripe</span>
              <span className="text-xs font-medium px-2 py-1 bg-muted rounded">LendPro</span>
              <span className="text-xs font-medium px-2 py-1 bg-muted rounded">LendPro</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

