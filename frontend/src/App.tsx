import { Route, Routes } from "react-router";
import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProjectsProvider } from "@/context/project-context";
import { ProjectPage } from "@/pages/project-page";
import { ProjectsStatusTable } from "@/pages/projects-page";
import { RequestHistoryPage } from "@/pages/request-history-page";


function Home() {
  return (
    <p className="text-muted-foreground">
      Select a project in the sidebar or create a new one
    </p>
  );
}

function App() {

  return (
    <>
      <Show when="signed-out">
        <div className="flex min-h-svh flex-col items-center justify-center gap-4">
          <h1 className="text-3xl font-semibold py-3 bg-green-500">Uptime Monitor</h1>
          <div className="flex gap-2">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="outline">Sign up</Button>
            </SignUpButton>
          </div>
        </div>
      </Show>

      <Show when="signed-in">
        <ProjectsProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header className="flex items-center gap-2 border-b px-4">
                <SidebarTrigger />
                  <h1 className="text-3xl font-semibold py-2">Uptime Monitor</h1>
              </header>

              <main className="flex-1 p-1">
                <Routes>
                  <Route path="/" element={<ProjectsStatusTable />} />
                  <Route path="/projects/:projectId" element={<ProjectPage />} />
                  <Route path="/central" element={< ProjectsStatusTable />} />
                  <Route
                    path="/projects/:projectId/requests/:requestId/history"
                    element={<RequestHistoryPage />}
                  />
                  <Route path="*" element={<Home />} />
                </Routes>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </ProjectsProvider>
      </Show>
    </>
  );
}

export default App;