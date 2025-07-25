"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import CreateAgentDialog from "@/components/CreateAgentDialog";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Assistant {
  name: string;
}

export default function AssistantsList() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [singleAssistant, setSingleAssistant] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<string | null>(null);
  const { accessToken, isAuthenticated } = useAuth();

  const assistantsPerPage = 10;

  const fetchAssistants = async () => {
    if (!accessToken || !isAuthenticated) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/assistants", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch assistants");
      }

      const data = await response.json();
      // Convert array of strings to array of objects
      const assistantNames = data.data || data || [];
      const assistantObjects = assistantNames.map((name: string) => ({ name }));
      setAssistants(assistantObjects);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setAssistants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleAssistant = async (assistantName: string) => {
    if (!accessToken || !isAuthenticated) {
      toast.error("Not authenticated. Please sign in again.");
      return null;
    }

    try {
      const response = await fetch(
        `/api/assistant?name=${encodeURIComponent(assistantName)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          toast.warning(
            `Assistant "${assistantName}" not found or has no detailed information available.`
          );
          return null;
        }
        if (response.status === 500) {
          toast.error(
            `Server error while loading "${assistantName}". Please try again later.`
          );
          return null;
        }
        if (response.status === 401) {
          toast.error("Authentication expired. Please sign in again.");
          return null;
        }
        // Handle other HTTP errors
        toast.error(
          `Failed to load assistant "${assistantName}" (Error: ${response.status}). Please try again.`
        );
        return null;
      }

      const data = await response.json();

      // Check if the response contains actual assistant data
      if (
        !data ||
        (typeof data === "object" && Object.keys(data).length === 0)
      ) {
        toast.warning(
          `No detailed information available for assistant "${assistantName}".`
        );
        setSingleAssistant(null);
        return null;
      }

      // For successful API calls, we consider any data as valid for editing
      setSingleAssistant(data);
      toast.success(`Successfully loaded details for "${assistantName}".`);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred fetching assistant details";
      toast.error(`Failed to load assistant details: ${errorMessage}`);
      console.error("Error fetching assistant data:", err);
      return null;
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, [accessToken, isAuthenticated]);

  const handleEditComplete = () => {
    // Refresh the assistants list after edit
    fetchAssistants();
    // Clear single assistant data
    setSingleAssistant(null);
    // Close dialog and reset editing state
    setEditDialogOpen(false);
    setEditingAssistant(null);
  };

  const handleEdit = async (assistantName: string) => {
    console.log(assistantName, "clicked for edit");

    // Show loading toast
    const loadingToast = toast.loading(
      `Loading details for "${assistantName}"...`
    );

    try {
      // Fetch single assistant details when edit is clicked
      const result = await fetchSingleAssistant(assistantName);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (result) {
        console.log("Fetched assistant data:", result);
        // Only open dialog if data was successfully loaded
        setEditingAssistant(assistantName);
        setEditDialogOpen(true);
      } else {
        console.log(`No data available for assistant: ${assistantName}`);
        // Don't open dialog if no data is available
        // Error/warning toast is already shown by fetchSingleAssistant
      }
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      // Show error toast only if it's an unexpected error
      console.error("Error in handleEdit:", error);
      toast.error(
        `Unexpected error while loading "${assistantName}". Please try again.`
      );
    }
  };

  const handleDelete = (assistantName: string) => {
    // TODO: Implement delete functionality
    console.log("Delete assistant:", assistantName);
  };

  const handleLaunch = (assistantName: string) => {
    const launchUrl = `https://idsgpt.cbrands.com/?assistant_name=${encodeURIComponent(
      assistantName
    )}`;
    window.open(launchUrl, "_blank");
    console.log("Launching assistant:", assistantName, "at URL:", launchUrl);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please sign in to view assistants.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading assistants...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error}
        <Button
          onClick={fetchAssistants}
          variant="outline"
          size="sm"
          className="ml-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (assistants.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No assistants found. Create your first assistant to get started.
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(assistants.length / assistantsPerPage);
  const startIndex = (currentPage - 1) * assistantsPerPage;
  const endIndex = startIndex + assistantsPerPage;
  const currentAssistants = assistants.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Your Assistants</h2>

      {/* Edit Dialog - controlled by state */}
      {editingAssistant && (
        <CreateAgentDialog
          trigger={<div style={{ display: "none" }} />}
          editMode={true}
          assistantName={editingAssistant}
          onEditComplete={handleEditComplete}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      <div className="space-y-4">
        {currentAssistants.map((assistant) => (
          <div
            key={assistant.name}
            className="flex items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
          >
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {assistant.name}
              </h3>
              <div className="text-sm text-gray-400 mt-2">
                Assistant Name: {assistant.name}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLaunch(assistant.name)}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                Launch
              </Button>

              {/* Edit Button - triggers API call first */}
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                onClick={() => handleEdit(assistant.name)}
              >
                Edit
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(assistant.name)}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    handlePageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Show pagination info */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Showing {startIndex + 1} to {Math.min(endIndex, assistants.length)} of{" "}
        {assistants.length} assistants
      </div>
    </div>
  );
}
