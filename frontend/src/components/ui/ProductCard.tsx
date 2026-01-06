import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, CreditCard } from 'lucide-react';
import { formatCurrency, getImageUrl, calculateDiscount, cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cart';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: Array<{ url: string; isPrimary?: boolean }> | string;
  category?: {
    id?: string;
    name: string;
    slug: string;
  };
  categoryId?: string;
  stock: number;
  isFeatured?: boolean;
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

// Calculate monthly payment for subprime financing (18 months)
function calculateMonthlyPayment(price: number, months: number = 18): number {
  // Subprime tier with small interest factor built in
  const totalWithFees = price * 1.15; // 15% total cost of financing
  return totalWithFees / months;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const isLoading = useCartStore((state) => state.isLoading);

  const discount = calculateDiscount(product.price, product.compareAtPrice);
  const isOutOfStock = product.stock <= 0;
  
  // Check if product is in Electronics category
  const isElectronics = 
    product.category?.slug === 'electronics' || 
    product.category?.name?.toLowerCase() === 'electronics' ||
    product.categoryId === '1'; // Electronics category ID in mock data

  const monthlyPayment = calculateMonthlyPayment(product.price);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    try {
      await addToCart(product.id, 1);
      toast.success('Added to cart', {
        description: product.name,
      });
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  return (
    <div className={cn('group relative', className)}>
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <img
            src={getImageUrl(product.images)}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {!isElectronics && discount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                -{discount}%
              </span>
            )}
            {isElectronics && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded-full flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                Financing
              </span>
            )}
            {product.isFeatured && !isElectronics && (
              <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                Featured
              </span>
            )}
            {isOutOfStock && (
              <span className="px-2 py-1 text-xs font-medium bg-muted-foreground text-background rounded-full">
                Out of Stock
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-2 bg-background/80 backdrop-blur rounded-full hover:bg-background transition-colors"
              aria-label="Add to wishlist"
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isLoading}
              className={cn(
                'w-full py-2.5 flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
                isOutOfStock
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <ShoppingCart className="w-4 h-4" />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-1">
          {product.category && (
            <p className="text-xs text-muted-foreground">{product.category.name}</p>
          )}
          <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          {isElectronics ? (
            // Electronics: Show financing payment only, no price
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  Pay as low as {formatCurrency(monthlyPayment)}/mo
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Up to 18 months • No credit needed
              </p>
            </div>
          ) : (
            // Non-electronics: Show regular price
            <>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatCurrency(product.price)}</span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                )}
              </div>
              {/* Financing Badge for non-electronics */}
              {product.price >= 50 && (
                <p className="text-xs text-primary">
                  As low as {formatCurrency(product.price / 4)}/mo with financing
                </p>
              )}
            </>
          )}
        </div>
      </Link>
    </div>
  );
}

export default ProductCard;
