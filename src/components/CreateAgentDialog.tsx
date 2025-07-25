"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

// Zod schema for form validation
const formSchema = z.object({
  assistantName: z.string().min(1, "Assistant Name is required").trim(),
  description: z.string().min(1, "Description is required").trim(),
  systemPrompt: z.string().min(1, "System Prompt is required").trim(),
  selectedTools: z.array(z.string()),
  selectedIndexes: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface CreateAgentDialogProps {
  trigger: React.ReactNode;
  editMode?: boolean;
  assistantName?: string;
  onEditComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Tool {
  id: string;
  name: string;
  description?: string;
}

interface Index {
  id: string;
  name: string;
  description?: string;
}

export default function CreateAgentDialog({ 
  trigger, 
  editMode = false, 
  assistantName: editAssistantName,
  onEditComplete,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: CreateAgentDialogProps) {
  const { accessToken, user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  
  const [tools, setTools] = useState<Tool[]>([]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    assistantName: "",
    description: "",
    systemPrompt: "",
    selectedTools: [],
    selectedIndexes: [],
  });


  // Fetch assistant data for editing
  const fetchAssistantData = async (assistantName: string) => {
    if (!accessToken) {
      console.error("No access token available");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/assistant?name=${encodeURIComponent(assistantName)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          toast.warning(`Assistant "${assistantName}" not found or has no detailed information available.`);
          return;
        }
        throw new Error(`Failed to fetch assistant data: ${res.status}`);
      }

      const response = await res.json();
      const assistantData = response.data || response;

      // Check if we have valid assistant data
      if (!assistantData || (typeof assistantData === 'object' && Object.keys(assistantData).length === 0)) {
        toast.warning(`No detailed information available for assistant "${assistantName}". You can still edit basic settings.`);
        // Set default values for editing
        setFormData({
          assistantName: assistantName,
          description: "",
          systemPrompt: "",
          selectedTools: [],
          selectedIndexes: [],
        });
        return;
      }

      // Prefill form with assistant data
      setFormData({
        assistantName: assistantData.assistantName || assistantName,
        description: assistantData.description || "",
        systemPrompt: assistantData.system_prompt || "",
        selectedTools: assistantData.tools || [],
        selectedIndexes: assistantData.index_retrievers?.map((retriever: { index_name: string }) => retriever.index_name) || [],
      });
      
      toast.success(`Successfully loaded details for "${assistantName}".`);
    } catch (error) {
      console.error("Error fetching assistant data:", error);
      toast.error(`Failed to fetch assistant data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Set default values so the dialog still works
      setFormData({
        assistantName: assistantName,
        description: "",
        systemPrompt: "",
        selectedTools: [],
        selectedIndexes: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch tools from API
  const fetchTools = async () => {
    if (!accessToken) {
      console.error("No access token available");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tools", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch tools");
      }

      const response = await res.json();
      // Handle the new API response structure with data array of strings
      const toolsList = response.data || [];
      const formattedTools = toolsList.map((toolName: string) => ({
        id: toolName,
        name: toolName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      }));
      setTools(formattedTools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch indexes from API
  const fetchIndexes = async () => {
    if (!accessToken) {
      console.error("No access token available");
      return;
    }

    try {
      const res = await fetch("/api/indexes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch indexes");
      }

      const response = await res.json();
      // Handle the API response structure with nested arrays [[[id, description]], ...]
      const indexesList = response.data || [];
      const formattedIndexes = indexesList.map((outerArray: [[string, string]]) => {
        const innerArray = outerArray[0]; // Get the inner array [id, description]
        const indexId = innerArray[0]; // First value is the ID (e.g., "microsoft-sharepoint-ea")
        const indexDescription = innerArray[1]; // Second value is the description
        return {
          id: indexId,
          name: indexId, // Display the ID exactly as it is
          description: indexDescription
        };
      });
      setIndexes(formattedIndexes);
    } catch (error) {
      console.error("Error fetching indexes:", error);
      setIndexes([]);
    }
  };

  // Fetch tools and indexes when dialog opens, and assistant data if in edit mode
  useEffect(() => {
    if (open && accessToken) {
      fetchTools();
      fetchIndexes();
      
      // If in edit mode and assistant name is provided, fetch the assistant data
      if (editMode && editAssistantName) {
        fetchAssistantData(editAssistantName);
      }
    }
  }, [open, accessToken, editMode, editAssistantName]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCheckboxChange = (
    group: "selectedTools" | "selectedIndexes",
    optionId: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [group]: prev[group].includes(optionId)
        ? prev[group].filter((id: string) => id !== optionId)
        : [...prev[group], optionId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate form data using Zod
    const validationResult = formSchema.safeParse(formData);
    
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0] as string] = issue.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    // Prepare data for API call
    const apiData = {
      id: "",
      name: validationResult.data.assistantName,
      description: validationResult.data.description,
      system_prompt: validationResult.data.systemPrompt,
      tools: validationResult.data.selectedTools.join(","), // Convert array to comma-separated string
      index_retrievers: "sharepoint",
      temp: {
        Temperature: "0.0"
      },
      type: "custom-idsgpt",
      employeeID: user?.email || "",
      input_variables: [
        {
          id: "string",
          name: "string",
          description: "string"
        }
      ],
      optional_variables: [
        {
          id: "string",
          name: "string",
          description: "string"
        }
      ]
    };

    try {
      setLoading(true);
      
      const response = await fetch("/api/assistants", {
        method: editMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editMode ? 'update' : 'create'} assistant: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`Assistant ${editMode ? 'updated' : 'created'} successfully:`, result);
      
      // Close dialog and reset form
      setOpen(false);
      setFormData({
        assistantName: "",
        description: "",
        systemPrompt: "",
        selectedTools: [],
        selectedIndexes: [],
      });
      
      // Call onEditComplete callback if provided (for edit mode)
      if (editMode && onEditComplete) {
        onEditComplete();
      }
      
    } catch (error) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} assistant:`, error);
      // You might want to show an error message to the user here
      alert(`Failed to ${editMode ? 'update' : 'create'} assistant. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        // Clear validation errors when dialog closes
        setValidationErrors({});
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      {/* Explicit overlay to ensure bg + z-index */}
      <DialogOverlay className="fixed inset-0 bg-black/50 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

      <DialogContent 
        className="sm:max-w-[750px] max-h-[90vh] z-50 border rounded-lg shadow-lg fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 flex flex-col" 
        style={{ 
          backgroundColor: '#ffffff', 
          color: '#000000',
          borderColor: '#e5e7eb'
        }}
      >
        <DialogHeader className="flex-shrink-0 p-6 pb-0">
          <DialogTitle className="text-black">
            {editMode ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {editMode ? 'Update the agent details below.' : 'Fill in the details to create a new agent.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <form id="agent-form" onSubmit={handleSubmit} className="space-y-6 py-6">
          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="assistantName" className="block text-sm font-medium mb-2 text-black">
                Assistant Name *
              </label>
              <Input
                id="assistantName"
                value={formData.assistantName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("assistantName", e.target.value)}
                required
                className={`bg-white text-black border-gray-300 ${validationErrors.assistantName ? 'border-red-500' : ''}`}
                placeholder="Enter assistant name"
              />
              {validationErrors.assistantName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.assistantName}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2 text-black">
                Description *
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("description", e.target.value)}
                required
                className={`bg-white text-black border-gray-300 ${validationErrors.description ? 'border-red-500' : ''}`}
                placeholder="Enter assistant description"
                rows={3}
              />
              {validationErrors.description && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
              )}
            </div>

            <div>
              <label htmlFor="systemPrompt" className="block text-sm font-medium mb-2 text-black">
                System Prompt *
              </label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("systemPrompt", e.target.value)}
                required
                className={`bg-white text-black border-gray-300 ${validationErrors.systemPrompt ? 'border-red-500' : ''}`}
                placeholder="Enter system prompt"
                rows={4}
              />
              {validationErrors.systemPrompt && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.systemPrompt}</p>
              )}
            </div>
          </div>

          {/* Checkbox Group 1 - Tools from API */}
          <CheckboxGroup
            title={loading ? "Loading Tools..." : "Available Tools"}
            options={tools.map(tool => ({ id: tool.id, label: tool.name }))}
            selected={formData.selectedTools}
            onToggle={(id) => handleCheckboxChange("selectedTools", id)}
          />

          {/* Checkbox Group 2 - Indexes from API */}
          <CheckboxGroup
            title="Available Indexes"
            options={indexes.map(index => ({ id: index.id, label: index.name }))}
            selected={formData.selectedIndexes}
            onToggle={(id) => handleCheckboxChange("selectedIndexes", id)}
          />
        </form>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-3 p-6 pt-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="agent-form" disabled={loading}>
            {loading ? (editMode ? "Updating..." : "Creating...") : (editMode ? "Update Agent" : "Create Agent")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --- Small helper component --- */
function CheckboxGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-3 text-black">{title}</label>
      <div className="border border-gray-200 rounded-md p-4 max-h-32 overflow-y-auto bg-white">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center space-x-2 mb-2">
            <Checkbox
              id={opt.id}
              checked={selected.includes(opt.id)}
              onCheckedChange={() => onToggle(opt.id)}
            />
            <label 
              htmlFor={opt.id} 
              className="text-sm text-black cursor-pointer"
            >
              {opt.label}
            </label>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 rounded border">
          <span className="text-xs text-gray-600">Selected: </span>
          <span className="text-xs text-black">
            {selected
              .map((id) => options.find((o) => o.id === id)?.label)
              .join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}
