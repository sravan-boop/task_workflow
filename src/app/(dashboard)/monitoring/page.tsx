import { Metadata } from "next";
import { MonitoringClient } from "./monitoring-client";

export const metadata: Metadata = {
    title: "Monitoring | TaskFlow",
    description: "Monitor and track all assigned tasks by projects or people.",
};

export default function MonitoringPage() {
    return (
        <div className="flex-1 overflow-auto bg-background p-8">
            <MonitoringClient />
        </div>
    );
}
