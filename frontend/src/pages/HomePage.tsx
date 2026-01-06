import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Shield, CreditCard, Truck, Percent } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';

export function HomePage() {
  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const response = await apiHelpers.getFeaturedProducts();
      return response.data.data.products;
    },
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight">
              Shop Now,{' '}
              <span className="text-primary">Pay Later</span>
              <br />
              with Flexible Financing
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Get instant approval from multiple lenders with our waterfall financing system.
              Shop premium furniture, mattresses, and electronics with payment plans that work for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="xl">
                  Shop Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/products?category=mattresses">
                <Button variant="outline" size="xl">
                  Shop Mattresses
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-8">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Multiple Lenders</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Warranty Options</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Free Shipping</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-l from-primary/10 to-transparent" />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Waterfall Financing</h3>
              <p className="text-sm text-muted-foreground">
                Get approved through multiple lenders automatically
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
                <Percent className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">0% APR Available</h3>
              <p className="text-sm text-muted-foreground">
                Qualified customers get interest-free financing
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Extended Warranty</h3>
              <p className="text-sm text-muted-foreground">
                Protect your purchase with comprehensive plans
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Free Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Free shipping on orders over $500
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-semibold">Featured Products</h2>
              <p className="text-muted-foreground mt-1">Hand-picked favorites just for you</p>
            </div>
            <Link to="/products">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-square bg-muted rounded-xl animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.map((product: Parameters<typeof ProductCard>[0]['product']) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Financing CTA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">
            Flexible Financing for Everyone
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Our waterfall financing system connects you with 35+ lenders to maximize your approval chances.
            Apply once, get multiple offers.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-8">
            <div>
              <div className="text-4xl font-bold">35+</div>
              <div className="text-sm opacity-75">Lending Partners</div>
            </div>
            <div>
              <div className="text-4xl font-bold">90%</div>
              <div className="text-sm opacity-75">Approval Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold">$50-$15K</div>
              <div className="text-sm opacity-75">Financing Range</div>
            </div>
          </div>
          <Link to="/products">
            <Button size="xl" variant="secondary">
              Start Shopping
            </Button>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-semibold text-center mb-12">
            Shop by Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/products?category=mattresses"
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"
            >
              <img
                src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"
                alt="Mattresses"
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white text-2xl font-semibold">Mattresses</h3>
                <p className="text-white/80 text-sm mt-1">Premium sleep solutions</p>
              </div>
            </Link>
            <Link
              to="/products?category=bedding"
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"
            >
              <img
                src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"
                alt="Bedding"
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white text-2xl font-semibold">Bedding</h3>
                <p className="text-white/80 text-sm mt-1">Sheets, pillows & more</p>
              </div>
            </Link>
            <Link
              to="/products?category=electronics"
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"
            >
              <img
                src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800"
                alt="Electronics"
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white text-2xl font-semibold">Electronics</h3>
                <p className="text-white/80 text-sm mt-1">TVs, audio & more</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;

