import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Grid, List, X } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = Number(searchParams.get('page')) || 1;

  const { data, isLoading } = useQuery({
    queryKey: ['products', { category, search, sortBy, sortOrder, page }],
    queryFn: async () => {
      const response = await apiHelpers.getProducts({
        categorySlug: category || undefined,
        search: search || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize: 12,
      });
      return response.data.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiHelpers.getCategories();
      return response.data.data.categories;
    },
  });

  const updateParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    newParams.delete('page'); // Reset page on filter change
    setSearchParams(newParams);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">
          {category ? categories?.find((c: { slug: string }) => c.slug === category)?.name || 'Products' : 'All Products'}
        </h1>
        {search && (
          <p className="text-muted-foreground mt-1">
            Search results for "{search}"
          </p>
        )}
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => updateParams({ category: null })}
                  className={cn(
                    'block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    !category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  All Products
                </button>
                {categories?.map((cat: { id: string; slug: string; name: string; _count?: { products: number } }) => (
                  <button
                    key={cat.id}
                    onClick={() => updateParams({ category: cat.slug })}
                    className={cn(
                      'block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      category === cat.slug ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    {cat.name}
                    {cat._count?.products && (
                      <span className="text-xs opacity-75 ml-2">({cat._count.products})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Sort By</h3>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  updateParams({ sortBy: newSortBy, sortOrder: newSortOrder });
                }}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(true)}
                className="lg:hidden"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <span className="text-sm text-muted-foreground">
                {data?.total || 0} products
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-lg',
                  viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted'
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-lg',
                  viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {(category || search) && (
            <div className="flex flex-wrap gap-2 mb-6">
              {category && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {categories?.find((c: { slug: string }) => c.slug === category)?.name}
                  <button onClick={() => updateParams({ category: null })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Search: {search}
                  <button onClick={() => updateParams({ search: null })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className={cn(
              'grid gap-6',
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' 
                : 'grid-cols-1'
            )}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-square bg-muted rounded-xl animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : data?.products?.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              <Button onClick={() => setSearchParams(new URLSearchParams())}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className={cn(
              'grid gap-6',
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' 
                : 'grid-cols-1'
            )}>
              {data?.products?.map((product: Parameters<typeof ProductCard>[0]['product']) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {[...Array(data.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', String(i + 1));
                    setSearchParams(newParams);
                  }}
                  className={cn(
                    'w-10 h-10 rounded-lg transition-colors',
                    page === i + 1
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-background p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg">Filters</h2>
              <button onClick={() => setIsFilterOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Same filter content as sidebar */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      updateParams({ category: null });
                      setIsFilterOpen(false);
                    }}
                    className={cn(
                      'block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      !category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    )}
                  >
                    All Products
                  </button>
                  {categories?.map((cat: { id: string; slug: string; name: string }) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        updateParams({ category: cat.slug });
                        setIsFilterOpen(false);
                      }}
                      className={cn(
                        'block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                        category === cat.slug ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductsPage;

