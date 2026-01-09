"use client";
import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  CreditCard,
  History,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IBrand } from "@/types/brand";
import Link from "next/link";
import { fetchData, deleteData } from "@/utils/fetch";
import Loading from "@/components/loading";
import ApiError from "@/components/api-error";
import Header from "@/components/header";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MatrixProvider, useMatrix } from "@/context/matrixContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserContext } from "@/context/userContext";
import formatCredits from "@/utils/formatCredits";

const BrandListContent = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const { user } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [brands, setBrands] = useState<IBrand[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<IBrand | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Use Matrix Context
  const { refreshMatrixData } = useMatrix();

  useEffect(() => {
    async function fetchAllBrandsOfUser() {
      setLoading(true);
      try {
        const response = await fetchData(`/api/brand?user_id=${userId}`);
        const { data } = response;
        const { brands: userBrands } = data;
        setBrands(userBrands);
      } catch (error) {
        setError(
          `Fetch Failed - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }
    if (userId) {
      fetchAllBrandsOfUser();
    }
  }, [userId]);

  const handleDeleteBrand = async () => {
    if (!brandToDelete) return;

    setDeleting(true);
    try {
      await deleteData(`/api/brand/${brandToDelete._id}`, {
        user_id: userId,
      });
      toast.success("Brand deleted successfully!");
      // Remove the deleted brand from the local state
      setBrands((prevBrands) =>
        prevBrands.filter((brand) => brand._id !== brandToDelete._id)
      );
      setDeleteDialogOpen(false);
      setBrandToDelete(null);
      // Refresh matrix data to remove deleted brand
      await refreshMatrixData();
    } catch (error) {
      toast.error(
        `Error deleting brand - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (brand: IBrand) => {
    setBrandToDelete(brand);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Loading message="Fetch all your brands..." />
      </div>
    );
  }

  const filteredBrands = brands.filter((brand) => {
    const matchesSearch = brand?.name
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const formatDate = (dateString: Date) => {
    return new Date(dateString).toLocaleDateString();
  };

  function ActionMenu({ brand }: { brand: IBrand }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="w-48 z-[100]"
          >
            <DropdownMenuLabel className="truncate">
              {brand.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                router.push(`/${userId}/brands/${brand._id}/edit-brand`)
              }
            >
              Edit Brand
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/${userId}/brands/${brand._id}/matrix`)
              }
            >
              View Metrics
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/${userId}/onboarding/clone-brand?brandId=${brand._id}`
                )
              }
            >
              Clone Brand
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive hover:text-white"
              onClick={() => openDeleteDialog(brand)}
            >
              Delete Brand
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    );
  }

  const BrandCard: React.FC<{ brand: IBrand }> = ({ brand }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-accent dark:text-accent" />
            </div>
            <div className="ml-3">
              <Link
                href={`/${userId}/brands/${brand._id}/dashboard`}
                className="text-lg font-semibold text-gray-900 dark:text-white underline hover:text-primary"
              >
                {brand.name}
              </Link>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{brand.category || "Uncategorized"}</span>
                <span>•</span>
                <span>{brand.region || "Global"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ActionMenu brand={brand} />
          </div>
        </div>

        {/* Brand Details Section */}
        <div className="mb-4 space-y-3">
          {/* Use Case */}
          {brand.use_case && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Use Case
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                {brand.use_case}
              </p>
            </div>
          )}

          {/* Target Audience */}
          {brand.target_audience && brand.target_audience.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Audience
              </h4>
              <div className="flex flex-wrap gap-1">
                {brand.target_audience.slice(0, 3).map((audience, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {audience}
                  </span>
                ))}
                {brand.target_audience.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    +{brand.target_audience.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Competitors */}
          {brand.competitors && brand.competitors.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Competitors
              </h4>
              <div className="flex flex-wrap gap-1">
                {brand.competitors.slice(0, 3).map((competitor, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  >
                    {competitor}
                  </span>
                ))}
                {brand.competitors.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    +{brand.competitors.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Key Features */}
          {brand.feature_list && brand.feature_list.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Key Features
              </h4>
              <div className="flex flex-wrap gap-1">
                {brand.feature_list.slice(0, 2).map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {feature}
                  </span>
                ))}
                {brand.feature_list.length > 2 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    +{brand.feature_list.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between text-sm">
          <Link
            href={`/${userId}/brands/${brand._id}/view-logs`}
            className="font-bold text-accent dark:text-accent hover:text-accent/80 dark:hover:text-accent/80 transition-colors"
          >
            View Logs
          </Link>
          <span className="text-gray-500 dark:text-gray-400">
            Created {formatDate(brand.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 h-screen overflow-auto">
      {/* Header */}
      <Header />
      {/* Body  */}
      <div className="px-6 py-4 lg:px-12 lg:py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              All Brands
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              All your brands are listed here.
            </p>
          </div>
          <Link
            href={`/${userId}/brands/create-brand`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Brand
          </Link>
        </div>

        {/* Credit Management Cards */}
        {user && user._id && (
          <div className="flex items-center gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer w-96">
              <Link href={`/${userId}/credits/purchase`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Purchase Credits
                        </CardTitle>
                        <CardDescription>
                          Buy credits to analyze your brands
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCredits(user.credits_balance ?? 0)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Current Balance
                      </p>
                    </div>
                    <CreditCard className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer w-96">
              <Link href={`/${userId}/transactions`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <History className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          Transaction History
                        </CardTitle>
                        <CardDescription>
                          View all your credit transactions
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCredits(user.total_credits_purchased ?? 0)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Total Purchased
                      </p>
                    </div>
                    <History className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-accent sm:text-sm"
                  placeholder="Search brands..."
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <ApiError message={error} setMessage={(value) => setError(value)} />
        )}

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBrands.map((brand) => (
            <BrandCard key={`${brand._id}`} brand={brand} />
          ))}
        </div>

        {filteredBrands.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No brands found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm
                ? "Try adjusting your search criteria."
                : "Get started by creating your first brand."}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href={`/${userId}/brands/create-brand`}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Brand
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{brandToDelete?.name}&quot;?
              This action cannot be undone and will permanently remove all
              associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteBrand}
              disabled={deleting}
              variant={deleting ? "outline" : "destructive"}
            >
              {deleting ? (
                <Loading message="Deleting brand..." />
              ) : (
                "Delete Brand"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Wrapper component with MatrixProvider (temporary fallback)
const BrandList = ({ userId }: { userId: string }) => {
  return (
    <MatrixProvider userId={userId}>
      <BrandListContent userId={userId} />
    </MatrixProvider>
  );
};

export default BrandList;
