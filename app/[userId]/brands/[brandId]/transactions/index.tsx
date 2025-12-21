"use client";

import { useEffect, useState, useCallback } from "react";
import moment from "moment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Plus,
  Minus,
  RefreshCw,
  Gift,
  Search,
  CalendarIcon,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { fetchData } from "@/utils/fetch";
import { useUserContext } from "@/context/userContext";
import ApiError from "@/components/api-error";
import Loading from "@/components/loading";
import { CreditTransaction } from "@/types/plans";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import formatCredits from "@/utils/formatCredits";
import { useRouter } from "next/navigation";

interface TransactionHistoryResponse {
  message: string;
  data: {
    transactions: CreditTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
      hasPrevious: boolean;
    };
    summary: {
      totalTransactions: number;
      currentPage: number;
      totalPages: number;
      showingFrom: number;
      showingTo: number;
    };
  };
}

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !isNaN(date.getTime());
}

export default function TransactionHistoryPage({
  userId,
  brandId,
}: {
  userId: string;
  brandId?: string;
}) {
  const { user } = useUserContext();

  const [transactionsData, setTransactionsData] = useState<{
    transactions: CreditTransaction[];
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
      hasPrevious: boolean;
      totalPages: number;
    };
  }>({
    transactions: [],
    pagination: {
      page: 1,
      limit: 10,
      hasMore: false,
      hasPrevious: false,
      totalPages: 1,
    },
  });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [startMonth, setStartMonth] = useState<Date | undefined>(startDate);
  const [endMonth, setEndMonth] = useState<Date | undefined>(endDate);

  const limit = 10;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset to first page when search changes
      if (searchTerm !== debouncedSearchTerm) {
        setCurrentPage(1);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    // If search is cleared, immediately update debounced term
    if (value === "") {
      setDebouncedSearchTerm("");
      setCurrentPage(1);
    }
  }, []);

  const fetchTransactions = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        // Build query parameters
        const queryParams = new URLSearchParams({
          userId: user._id,
          page: page.toString(),
          limit: limit.toString(),
        });

        // Add filters if they exist
        if (typeFilter && typeFilter !== "all") {
          queryParams.append("type", typeFilter);
        }
        if (startDate) {
          queryParams.append("startDate", startDate.toISOString());
        }
        if (endDate) {
          queryParams.append("endDate", endDate.toISOString());
        }

        const response: TransactionHistoryResponse = await fetchData(
          `/api/credits/history?${queryParams.toString()}`
        );

        if (response.data) {
          const newTransactions = response.data.transactions;

          setTransactionsData({
            transactions: newTransactions,
            pagination: response.data.pagination,
          });
          setCurrentPage(page);
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch transactions"
        );
      } finally {
        setLoading(false);
      }
    },
    [user._id, limit, typeFilter, startDate, endDate]
  );

  useEffect(() => {
    if (user._id) {
      fetchTransactions(1);
    }
  }, [user._id, fetchTransactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "usage":
        return <Minus className="h-4 w-4 text-red-600" />;
      case "refund":
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case "bonus":
        return <Gift className="h-4 w-4 text-purple-600" />;
      default:
        return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const variants = {
      purchase: "default",
      usage: "destructive",
      refund: "secondary",
      bonus: "outline",
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === "usage" ? "" : amount > 0 ? "+" : "";
    return `${prefix}${formatCredits(amount)}`;
  };

  const refresh = () => {
    fetchTransactions(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setTypeFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = typeFilter !== "all" || startDate || endDate;

  const { transactions, pagination } = transactionsData;

  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = pagination?.hasMore || false;
  const hasPreviousPage = pagination?.hasPrevious || false;

  // Filter transactions based on search term (client-side filtering for search)
  const filteredTransactions = transactions.filter((transaction) => {
    if (!debouncedSearchTerm) return true;
    return (
      transaction.description
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase()) ||
      (transaction.analysis_id &&
        transaction.analysis_id
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase())) ||
      (transaction.stripe_payment_intent_id &&
        transaction.stripe_payment_intent_id
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()))
    );
  });

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchTransactions(page);
    }
  };
  const generatePageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxPagesToShow - 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="Loading transaction history..." />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${brandId ? "" : "p-12"}`}>
      {/* BACK BUTTON */}
      {!brandId && (
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Brands
        </Button>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Transaction History
          </h1>
          <p className="text-muted-foreground">
            View all your credit transactions and activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="outline" size="sm">
              Clear Filters
            </Button>
          )}
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-4 w-full">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center space-x-4 w-full">
            {/* SEARCH TRANSACTIONS */}
            <div className="w-[30%]">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Transactions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search descriptions, IDs..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className={`pl-10 ${
                    searchTerm !== debouncedSearchTerm
                      ? "border-blue-300 dark:border-blue-600"
                      : ""
                  }`}
                />
                {searchTerm !== debouncedSearchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            {/* TRANSACTION TYPE */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* START DATE */}
            <div>
              <label
                htmlFor="startDate"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Start Date
              </label>
              <div className="relative flex gap-2">
                <Input
                  id="startDate"
                  autoComplete="off"
                  value={formatDate(startDate)}
                  placeholder="02/01/2025"
                  className="bg-background pr-10 w-44 disabled:opacity-50 disabled:cursor-not-allowed"
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setStartDate(date);
                    setEndDate(undefined);
                    if (isValidDate(date)) {
                      setStartDate(date);
                      setStartMonth(date);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setStartOpen(true);
                    }
                  }}
                />
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker"
                      variant="ghost"
                      className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                    >
                      <CalendarIcon className="size-3.5" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={startDate}
                      captionLayout="dropdown"
                      month={startMonth}
                      disabled={(date) => date > new Date()}
                      onMonthChange={setStartMonth}
                      onSelect={(date) => {
                        setStartDate(date);
                        setStartMonth(date);
                        setStartOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* END DATE */}
            <div>
              <label
                htmlFor="endDate"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                End Date
              </label>
              <div className="relative flex gap-2">
                <Input
                  id="endDate"
                  autoComplete="off"
                  value={formatDate(endDate)}
                  disabled={!startDate}
                  placeholder="02/01/2025"
                  className="bg-background pr-10 w-44"
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setEndDate(date);
                    if (isValidDate(date)) {
                      setEndDate(date);
                      setStartMonth(date);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setEndOpen(true);
                    }
                  }}
                />
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker"
                      variant="ghost"
                      className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                    >
                      <CalendarIcon className="size-3.5" />
                      <span className="sr-only">Select date</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                  >
                    <Calendar
                      mode="single"
                      selected={endDate}
                      disabled={(date) => {
                        if (startDate) {
                          return date < startDate || date > new Date();
                        }
                        return false;
                      }}
                      captionLayout="dropdown"
                      month={endMonth}
                      onMonthChange={setStartMonth}
                      onSelect={(date) => {
                        setEndDate(date);
                        setEndMonth(date);
                        setEndOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <ApiError message={error} setMessage={setError} />}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Transactions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredTransactions.length > 0
                ? `Showing ${filteredTransactions.length} transaction${
                    filteredTransactions.length !== 1 ? "s" : ""
                  }${hasActiveFilters ? " (filtered)" : ""}`
                : hasActiveFilters
                ? "No transactions found matching the selected filters"
                : "No transactions found"}
            </p>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                {hasActiveFilters
                  ? "No matching transactions"
                  : "No transactions yet"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "Your credit transactions will appear here once you start using the platform."}
              </p>
              <div className="flex gap-2 justify-center">
                {hasActiveFilters ? (
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                ) : (
                  <Button asChild>
                    <a
                      href={
                        brandId
                          ? `/${userId}/brands/${brandId}/credits/purchase`
                          : `/${userId}/credits/purchase`
                      }
                    >
                      Purchase Credits
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 w-full">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white w-[10%]">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white w-[55%]">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white w-[15%]">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white w-[20%]">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction._id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 w-full"
                    >
                      <td className="py-4 px-4 w-[10%]">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          {getTransactionBadge(transaction.type)}
                        </div>
                      </td>
                      <td className="py-4 px-4 w-[55%]">
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {transaction.description}
                          </p>
                          {transaction.analysis_id && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Analysis ID: {transaction.analysis_id}
                            </p>
                          )}
                          {transaction.stripe_payment_intent_id && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Payment ID: {transaction.stripe_payment_intent_id}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right w-[15%]">
                        <span
                          className={`font-semibold ${
                            transaction.amount > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatAmount(transaction.amount, transaction.type)}{" "}
                          credits
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-500 dark:text-gray-400 w-[20%]">
                        {moment(transaction.createdAt).format(
                          "MMM DD, YYYY hh:mm A"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={
                        !hasPreviousPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {generatePageNumbers().map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={pageNumber === currentPage}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={
                        !hasNextPage
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
