"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Briefcase, FolderDot, UserCircle2, AlertCircle, TableProperties, Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function MonitoringClient() {
    const { data: workspaces } = trpc.workspaces.list.useQuery();
    const workspaceId = workspaces?.[0]?.id;

    const [viewType, setViewType] = useState<"projects" | "portfolios" | "people">("projects");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { data: filters, isLoading: isLoadingFilters } = trpc.monitoring.getFilters.useQuery(
        { workspaceId: workspaceId! },
        { enabled: !!workspaceId }
    );

    // Queries for data based on selected view
    const { data: projectTasks, isLoading: isLoadingProject } = trpc.monitoring.getProjectTasks.useQuery(
        { projectIds: selectedIds },
        { enabled: viewType === "projects" && selectedIds.length > 0 }
    );

    const { data: portfolioTasks, isLoading: isLoadingPortfolio } = trpc.monitoring.getPortfolioTasks.useQuery(
        { portfolioIds: selectedIds },
        { enabled: viewType === "portfolios" && selectedIds.length > 0 }
    );

    const { data: userTasks, isLoading: isLoadingUser } = trpc.monitoring.getUserTasks.useQuery(
        { workspaceId: workspaceId!, userIds: selectedIds },
        { enabled: viewType === "people" && selectedIds.length > 0 && !!workspaceId }
    );

    // Compute Active Data
    let activeTasks = [];
    let isFetchingData = false;
    if (viewType === "projects") {
        activeTasks = projectTasks || [];
        isFetchingData = isLoadingProject;
    } else if (viewType === "portfolios") {
        activeTasks = portfolioTasks || [];
        isFetchingData = isLoadingPortfolio;
    } else {
        activeTasks = userTasks || [];
        isFetchingData = isLoadingUser;
    }

    // Auto-select first item when changing viewType
    const handleViewTypeChange = (value: string) => {
        setViewType(value as any);
        setSelectedIds([]);
    };

    if (!workspaceId) {
        return <div className="p-4 text-muted-foreground">Loading workspace...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-[#1e1f21] dark:text-foreground">
                    Workspace Monitoring
                </h1>
                <p className="text-sm text-muted-foreground">
                    Track and monitor tasks across the entire organization grouped by specific projects, portfolios, or individual members.
                </p>
            </div>

            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium whitespace-nowrap">View by:</span>
                    <Select value={viewType} onValueChange={handleViewTypeChange}>
                        <SelectTrigger className="w-[180px] bg-background">
                            <SelectValue placeholder="Select view type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="projects">Project</SelectItem>
                            <SelectItem value="portfolios">Portfolio</SelectItem>
                            <SelectItem value="people">Specific Person</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-px h-8 bg-border"></div>

                <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <span className="text-sm font-medium whitespace-nowrap">Filter:</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-[300px] justify-between bg-background" disabled={isLoadingFilters}>
                                {selectedIds.length > 0
                                    ? `${selectedIds.length} ${viewType === "people" ? "people" : viewType} selected`
                                    : `Select ${viewType === "people" ? "people" : viewType}...`}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-y-auto">
                            {viewType === "projects" &&
                                filters?.projects.map((p: any) => (
                                    <DropdownMenuCheckboxItem
                                        key={p.id}
                                        checked={selectedIds.includes(p.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedIds(prev =>
                                                checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                                            );
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FolderDot className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="truncate">{p.name}</span>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            {viewType === "portfolios" &&
                                filters?.portfolios.map((p: any) => (
                                    <DropdownMenuCheckboxItem
                                        key={p.id}
                                        checked={selectedIds.includes(p.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedIds(prev =>
                                                checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                                            );
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="truncate">{p.name}</span>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            {viewType === "people" &&
                                filters?.users.map((u: any) => (
                                    <DropdownMenuCheckboxItem
                                        key={u.id}
                                        checked={selectedIds.includes(u.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedIds(prev =>
                                                checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                                            );
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <UserCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <span className="truncate">{u.name}</span>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {selectedIds.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds([])}
                            className="text-muted-foreground text-xs"
                        >
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {selectedIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center border rounded-xl border-dashed bg-muted/10">
                    <TableProperties className="h-10 w-10 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">Select a Filter to View Data</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                        Choose specific projects, portfolios, or people from the filters above to load an Excel-style monitoring table.
                    </p>
                </div>
            ) : isFetchingData ? (
                <div className="space-y-4">
                    <Skeleton className="h-[40px] w-full" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
            ) : activeTasks.length === 0 ? (
                <div className="p-12 text-center border rounded-xl bg-muted/10">
                    <p className="text-muted-foreground">No tasks found for this selection.</p>
                </div>
            ) : (
                <div className="rounded-xl border bg-background overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Task Name</th>
                                    {viewType === "people" && <th className="px-6 py-4 font-medium">Project</th>}
                                    {viewType !== "people" && <th className="px-6 py-4 font-medium">Assignee</th>}
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Priority</th>
                                    <th className="px-6 py-4 font-medium">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTasks.map((task: any) => {
                                    const projectNames = task.taskProjects?.map((tp: any) => tp.project?.name).filter(Boolean).join(", ");

                                    return (
                                        <tr
                                            key={task.id}
                                            className="bg-background border-b hover:bg-muted/30 transition-colors last:border-0"
                                        >
                                            <td className="px-6 py-4 font-medium text-foreground truncate max-w-[300px]" title={task.title}>
                                                {task.title}
                                            </td>

                                            {/* Only showing Project if viewing by Person */}
                                            {viewType === "people" && (
                                                <td className="px-6 py-4 text-muted-foreground truncate max-w-[200px]" title={projectNames}>
                                                    {projectNames || "No Project"}
                                                </td>
                                            )}

                                            {/* Only showing Assignee if viewing by Project/Portfolio */}
                                            {viewType !== "people" && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {task.assignee ? (
                                                            <>
                                                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                                                    {(task.assignee.name || task.assignee.email || "U")[0]?.toUpperCase()}
                                                                </div>
                                                                <span className="truncate">{task.assignee.name || task.assignee.email}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">Unassigned</span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            <td className="px-6 py-4">
                                                <Badge
                                                    variant="outline"
                                                    className={task.status === "COMPLETE" ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted/50"}
                                                >
                                                    {task.status}
                                                </Badge>
                                            </td>

                                            <td className="px-6 py-4">
                                                {task.priority ? (
                                                    <span className={`text-xs px-2 py-1 rounded-md font-medium
                            ${task.priority === "HIGH" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                            task.priority === "MEDIUM" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                                                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}
                                                    >
                                                        {task.priority}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-muted-foreground">
                                                {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
