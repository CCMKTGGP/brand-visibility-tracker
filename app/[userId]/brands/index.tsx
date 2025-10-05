"use client";
import React, { useEffect, useState } from "react";
import { Plus, Search, MoreHorizontal, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CATEGORIES } from "@/constants/onboarding-constants";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BrandMatrixSummaryComponent from "@/components/brand-matrix-summary";
import {
  MatrixProvider,
  useMatrix,
  useBrandMatrix,
} from "@/context/matrixContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const BrandListContent = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [brands, setBrands] = useState<IBrand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<IBrand | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Use Matrix Context
  const {
    loading: matrixLoading,
    selectedPeriod,
    showMatrixData,
    setSelectedPeriod,
    setShowMatrixData,
    refreshMatrixData,
    getMatrixDataForBrand,
  } = useMatrix();

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
      // Refresh matrix data to remove deleted brand
      await refreshMatrixData();
      setDeleteDialogOpen(false);
      setBrandToDelete(null);
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
    const matchesSearch = brand.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || brand.category === selectedCategory;

    return matchesSearch && matchesCategory;
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
    const { matrixData: brandMatrixData, loading: brandMatrixLoading } =
      useBrandMatrix(brand._id.toString());

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
                <span>{brand.category}</span>
                <span>•</span>
                <span>{brand.region}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(brand.status)}`}>
            {brand.status}
          </span> */}
            <ActionMenu brand={brand} />
          </div>
        </div>

        {/* Matrix Data Section */}
        {showMatrixData && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {brandMatrixLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loading message="Loading metrics..." />
              </div>
            ) : brandMatrixData ? (
              <BrandMatrixSummaryComponent
                matrixData={brandMatrixData}
                compact
              />
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No analysis data available</p>
              </div>
            )}
          </div>
        )}

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

  const BrandTable: React.FC = () => (
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-700">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Brand
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Category
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Region
          </th>
          {showMatrixData && (
            <>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Avg Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Analyses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Success Rate
              </th>
            </>
          )}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Last Updated
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {filteredBrands.map((brand) => {
          const brandMatrixData = getMatrixDataForBrand(brand._id.toString());

          return (
            <tr
              key={`${brand._id}-${brand.name}`}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-md flex items-center justify-center mr-3">
                    <Building2 className="w-4 h-4 text-accent dark:text-accent" />
                  </div>
                  <Link
                    href={`/${userId}/brands/${brand._id}/dashboard`}
                    className="text-sm font-medium text-gray-900 dark:text-white underline hover:text-primary"
                  >
                    {brand.name}
                  </Link>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {brand.category}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {brand.region}
              </td>
              {showMatrixData && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {matrixLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-4 w-12 rounded"></div>
                    ) : brandMatrixData?.hasData ? (
                      <span
                        className={`font-medium ${
                          brandMatrixData.avgWeightedScore >= 80
                            ? "text-green-600 dark:text-green-400"
                            : brandMatrixData.avgWeightedScore >= 60
                            ? "text-yellow-600 dark:text-yellow-400"
                            : brandMatrixData.avgWeightedScore >= 40
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {brandMatrixData.avgWeightedScore}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No data</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {matrixLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-4 w-8 rounded"></div>
                    ) : brandMatrixData?.hasData ? (
                      brandMatrixData.totalAnalyses
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {matrixLoading ? (
                      <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-4 w-12 rounded"></div>
                    ) : brandMatrixData?.hasData ? (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          brandMatrixData.successRate >= 90
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : brandMatrixData.successRate >= 70
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {brandMatrixData.successRate}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {formatDate(brand.updatedAt)}
              </td>
              <td className="px-6 py-4 text-left">
                <div className="flex items-center">
                  <ActionMenu brand={brand} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

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

        {/* Filters and Search */}
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

            <div className="flex items-center space-x-4">
              <Select
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value)}
              >
                <SelectTrigger className="w-fit">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-4">
                {/* Matrix Data Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showMatrix"
                    checked={showMatrixData}
                    onCheckedChange={(checked) =>
                      setShowMatrixData(checked === true)
                    }
                  />
                  <label
                    htmlFor="showMatrix"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Show Analytics
                  </label>
                </div>

                {/* Period Selection */}
                {showMatrixData && (
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="90d">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* View Mode Toggle */}
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-md">
                  <button
                    onClick={() => setViewMode("card")}
                    className={`px-3 py-2 text-sm font-medium ${
                      viewMode === "card"
                        ? "bg-accent/5 dark:bg-accent/5 text-accent dark:text-accent"
                        : "text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-200"
                    } transition-colors`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-2 text-sm font-medium border-l border-gray-300 dark:border-gray-600 ${
                      viewMode === "table"
                        ? "bg-accent/5 dark:bg-accent/5 text-accent dark:text-accent"
                        : "text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-200"
                    } transition-colors`}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <ApiError message={error} setMessage={(value) => setError(value)} />
        )}

        {/* Results */}
        {viewMode === "card" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <BrandCard key={`${brand._id}`} brand={brand} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <BrandTable />
            </div>
          </div>
        )}

        {filteredBrands.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No brands found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedCategory !== "all"
                ? "Try adjusting your search criteria."
                : "Get started by creating your first brand."}
            </p>
            {!searchTerm && selectedCategory === "all" && (
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
