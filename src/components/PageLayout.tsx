
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';

interface PageLayoutProps {
    children: React.ReactNode;
    onAddJob?: () => void;
    onAddCandidate?: () => void;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export function PageLayout({ children, onAddJob, onAddCandidate, onRefresh, isLoading }: PageLayoutProps) {
    return (
        <div className="flex min-h-screen w-full bg-background">
            <Sidebar />
            <main className="flex-1 md:ml-60">
                <DashboardHeader
                    onAddJob={onAddJob}
                    onAddCandidate={onAddCandidate}
                    onRefresh={onRefresh}
                    isLoading={isLoading}
                />
                <div className="p-6 space-y-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
