"use client"
import { Button } from "@/components/ui/button";
import CreateAgentDialog from "@/components/CreateAgentDialog";
import AssistantsList from "@/components/AssistantsList";

export default function Home() {
  return (
    <div className="font-sans min-h-[calc(100vh-80px)] p-8 pb-20 gap-16 sm:p-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <CreateAgentDialog
            trigger={
              <Button className="mt-4 bg-[#11386D] text-white p-4 font-semibold">
                Create New Agent
              </Button>
            }
          />
        </div>
        
        <AssistantsList />
      </div>
    </div>
  );
}
