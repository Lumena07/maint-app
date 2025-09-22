"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Aircraft, MaintenanceTask, ComplianceRecord, Assembly, Component } from "@/lib/types";
import { Projections } from "@/components/Projections";
import { AircraftDetails } from "@/components/AircraftDetails";
import { TasksComponentsTable } from "@/components/TasksComponentsTable";
import { HoursTracking } from "@/components/HoursTracking";

type TabProps = {
  aircraft: Aircraft;
  onAircraftUpdate?: (updatedAircraft: Aircraft) => void;
};

type Tab = "tasks-components" | "hours" | "projections" | "aircraft-details";

export default function AircraftTabs({ aircraft, onAircraftUpdate }: TabProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("tasks-components");
  
  // State for data loaded from API
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for aircraft data (can be updated when hours are added)
  const [currentAircraft, setCurrentAircraft] = useState<Aircraft>(aircraft);

  // Function to handle aircraft updates (e.g., when hours are added)
  const handleAircraftUpdate = (updatedAircraft: Aircraft) => {
    setCurrentAircraft(updatedAircraft);
    // Also call the parent callback if provided
    if (onAircraftUpdate) {
      onAircraftUpdate(updatedAircraft);
    }
  };

  // Load data from API endpoints
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load tasks and components from API
        const [tasksResponse, componentsResponse] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/components')
        ]);
        
        if (tasksResponse.ok) {
          const allTasks = await tasksResponse.json();
          // Filter tasks for this aircraft
          const aircraftTasks = allTasks.filter((t: MaintenanceTask) => 
            t.aircraftType === aircraft.type || t.tailSpecificId === aircraft.id
          );
          setTasks(aircraftTasks);
        }
        
        if (componentsResponse.ok) {
          const allComponents = await componentsResponse.json();
          // Filter components for this aircraft
          const aircraftComponents = allComponents.filter((c: Component) => 
            c.aircraftId === aircraft.id
          );
          setComponents(aircraftComponents);
        }
        
        // For now, set empty arrays for assemblies and compliance
        // These can be loaded from API endpoints if they exist
        setAssemblies([]);
        setCompliance([]);
        
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [aircraft.id, aircraft.type]);

  // Function to refresh data after updates
  const refreshData = async () => {
    try {
      const [tasksResponse, componentsResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/components')
      ]);
      
      if (tasksResponse.ok) {
        const allTasks = await tasksResponse.json();
        const aircraftTasks = allTasks.filter((t: MaintenanceTask) => 
          t.aircraftType === aircraft.type || t.tailSpecificId === aircraft.id
        );
        setTasks(aircraftTasks);
      }
      
      if (componentsResponse.ok) {
        const allComponents = await componentsResponse.json();
        const aircraftComponents = allComponents.filter((c: Component) => 
          c.aircraftId === aircraft.id
        );
        setComponents(aircraftComponents);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  // Initialize tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as Tab;
    if (tabParam && ['tasks-components', 'hours', 'projections', 'aircraft-details'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // const engines = assemblies.filter(a => a.type === "Engine");
  // const props = assemblies.filter(a => a.type === "Propeller");

  const tabs: { id: Tab; label: string }[] = [
    { id: "tasks-components", label: "Tasks/Components" },
    { id: "hours", label: "Hours" },
    { id: "projections", label: "Projections" },
    { id: "aircraft-details", label: "Aircraft Details" },
  ];

  const handleTabClick = (tabId: Tab) => {
    setActiveTab(tabId);
    // Update URL to preserve tab state
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleKeyDown = (event: React.KeyboardEvent, tabId: Tab) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTabClick(tabId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "tasks-components" && (
          <div id="tabpanel-tasks-components" role="tabpanel" aria-labelledby="tab-tasks-components">
            <TasksComponentsTable 
              aircraft={currentAircraft} 
              tasks={tasks} 
              components={components}
              onDataUpdate={refreshData}
            />
          </div>
        )}

        {activeTab === "hours" && (
          <div id="tabpanel-hours" role="tabpanel" aria-labelledby="tab-hours">
            <HoursTracking 
              aircraft={currentAircraft} 
              assemblies={assemblies} 
              onAircraftUpdate={handleAircraftUpdate}
            />
          </div>
        )}

        {activeTab === "projections" && (
          <div id="tabpanel-projections" role="tabpanel" aria-labelledby="tab-projections">
            <div className="rounded border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold">Projections 30/60/90</h2>
              <Projections aircraft={currentAircraft} tasks={tasks} components={components} />
            </div>
          </div>
        )}

        {activeTab === "aircraft-details" && (
          <div id="tabpanel-aircraft-details" role="tabpanel" aria-labelledby="tab-aircraft-details">
            <AircraftDetails aircraft={currentAircraft} onAircraftUpdate={handleAircraftUpdate} />
          </div>
        )}
      </div>
    </div>
  );
} 