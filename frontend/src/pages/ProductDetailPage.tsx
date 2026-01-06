import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Heart, Shield, Truck, CreditCard, ChevronRight, Plus, Minus, Check } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { useCartStore } from '@/stores/cart';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/components/ui/ProductCard';
import { formatCurrency, getImageUrl, calculateDiscount, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WarrantyPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMonths: number;
  provider?: { name: string; logoUrl?: string };
}

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedWarranty, setSelectedWarranty] = useState<string | null>(null);
  const addToCart = useCartStore((state) => state.addToCart);
  const isCartLoading = useCartStore((state) => state.isLoading);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await apiHelpers.getProduct(slug!);
      return response.data.data.product;
    },
    enabled: !!slug,
  });

  const { data: warrantyPlans } = useQuery({
    queryKey: ['warranty-plans', product?.id],
    queryFn: async () => {
      const response = await apiHelpers.getWarrantyPlans(product!.id);
      return response.data.data.plans as WarrantyPlan[];
    },
    enabled: !!product?.id,
  });

  const { data: upsells } = useQuery({
    queryKey: ['upsells', product?.id],
    queryFn: async () => {
      const response = await apiHelpers.getProductUpsells(product!.id, { location: 'product_page' });
      return response.data.data;
    },
    enabled: !!product?.id,
  });

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      await addToCart(product.id, quantity, selectedWarranty || undefined);
      toast.success('Added to cart', { description: product.name });
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-muted rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-4">Product not found</h1>
        <Link to="/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    );
  }

  const discount = calculateDiscount(product.price, product.compareAtPrice);
  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
  const selectedWarrantyPlan = warrantyPlans?.find((w: WarrantyPlan) => w.id === selectedWarranty);
  const totalPrice = Number(product.price) * quantity + (selectedWarrantyPlan?.price || 0);
  
  // Check if product is in Electronics category
  const isElectronics = 
    product.category?.slug === 'electronics' || 
    product.category?.name?.toLowerCase() === 'electronics' ||
    product.categoryId === '1';
  
  // Calculate monthly payment for subprime financing (18 months)
  const calculateMonthlyPayment = (price: number, months: number = 18): number => {
    const totalWithFees = price * 1.15; // 15% total cost of financing
    return totalWithFees / months;
  };
  
  const monthlyPayment = calculateMonthlyPayment(Number(product.price));
  const totalMonthlyWithWarranty = calculateMonthlyPayment(totalPrice);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/products" className="hover:text-foreground">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="w-4 h-4" />
            <Link to={`/products?category=${product.category.slug}`} className="hover:text-foreground">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            <img
              src={getImageUrl(images)}
              alt={product.name}
              className="object-cover w-full h-full"
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-destructive text-destructive-foreground text-sm font-medium rounded-full">
                -{discount}% OFF
              </span>
            )}
          </div>
          {images?.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {images.map((image: { url: string; alt?: string }, index: number) => (
                <button key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={image.url} alt={image.alt || product.name} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            {product.category && (
              <p className="text-sm text-muted-foreground mb-1">{product.category.name}</p>
            )}
            <h1 className="font-display text-3xl font-semibold">{product.name}</h1>
          </div>

          {isElectronics ? (
            // Electronics: Show financing payment only, no price
            <div className="space-y-4">
              <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Flexible Financing Available</p>
                    <p className="text-3xl font-bold text-blue-700">
                      Pay as low as {formatCurrency(monthlyPayment)}/mo
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">Up to 18 months</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">No credit needed</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">Instant approval</span>
                </div>
              </div>
            </div>
          ) : (
            // Non-electronics: Show regular price
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">{formatCurrency(product.price)}</span>
                {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
              </div>

              {/* Financing Badge */}
              {product.price >= 50 && (
                <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Pay as low as {formatCurrency(product.price / 4)}/mo</p>
                    <p className="text-sm text-muted-foreground">With financing • 0% APR available</p>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-muted-foreground">{product.description}</p>

          {/* Warranty Selection */}
          {warrantyPlans && warrantyPlans.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Protect Your Purchase
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedWarranty(null)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 border rounded-xl transition-colors',
                    !selectedWarranty ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                  )}
                >
                  <span>No protection plan</span>
                  {!selectedWarranty && <Check className="w-5 h-5 text-primary" />}
                </button>
                {warrantyPlans.map((plan: WarrantyPlan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedWarranty(plan.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 border rounded-xl transition-colors',
                      selectedWarranty === plan.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                    )}
                  >
                    <div className="text-left">
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.durationMonths} months coverage</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(plan.price)}</span>
                      {selectedWarranty === plan.id && <Check className="w-5 h-5 text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="font-medium">Quantity:</span>
            <div className="flex items-center border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 hover:bg-muted transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="p-3 hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-muted-foreground">
              {product.stock} in stock
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              size="xl"
              className={cn("flex-1", isElectronics && "bg-blue-600 hover:bg-blue-700")}
              onClick={handleAddToCart}
              isLoading={isCartLoading}
              disabled={product.stock === 0}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {isElectronics 
                ? `Add to Cart - ${formatCurrency(totalMonthlyWithWarranty)}/mo`
                : `Add to Cart - ${formatCurrency(totalPrice)}`
              }
            </Button>
            <Button size="xl" variant="outline">
              <Heart className="w-5 h-5" />
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Truck className="w-5 h-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Free Shipping</p>
                <p className="text-muted-foreground">Orders over $500</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Warranty Available</p>
                <p className="text-muted-foreground">Up to 5 years</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upsells */}
      {upsells?.groups && upsells.groups.length > 0 && (
        <section className="mt-16">
          {upsells.groups.map((group: { type: string; displayText?: string; items: Array<{ product: Parameters<typeof ProductCard>[0]['product'] }> }) => (
            <div key={group.type} className="mb-12">
              <h2 className="font-display text-2xl font-semibold mb-6">
                {group.displayText || 'Frequently Bought Together'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {group.items.slice(0, 4).map((item: { product: Parameters<typeof ProductCard>[0]['product'] }) => (
                  <ProductCard key={item.product.id} product={item.product} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default ProductDetailPage;

