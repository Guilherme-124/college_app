import { useState } from "react";
import { useLocation, useMatch, useNavigate } from "react-router";
import { UserButton } from "@clerk/react";
import { Check, ChevronsUpDown, FolderKanban, Plus, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useProjects } from "@/context/project-context";




export function AppSidebar() {
  const { projects } = useProjects();
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const [OpenCreate, setOpenCreate] = useState(false);
  const { pathname } = useLocation();

  const match = useMatch({ path: "/projects/:projectId", end: false });
  const currentProject = projects.find((p) => p.id === match?.params.projectId);



function handleNavigate(path: string) {
  navigate(path);
  if (isMobile) setOpenMobile(false);
}


  function handleSelect(id: string) {
    navigate(`/projects/${id}`);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="cursor-pointer"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <FolderKanban size={16} />
                    </div>

                    <div className="flex flex-col text-left text-sm truncate">
                      <span className="font-medium truncate">
                        {currentProject?.nome ?? "Selecione um Projeto"}
                      </span>
                      <span className="text-xs capitalize opacity-85">
                        {currentProject?.papel ?? `${projects.length} projetos`}
                      </span>
                    </div>

                    <ChevronsUpDown className="ml-auto opacity-70" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-64"
                  align="start"
                  side={"right"}
                >
                  <DropdownMenuLabel className="text-xs">
                    Projetos
                  </DropdownMenuLabel>

                  {projects.length === 0 ? (
                    <DropdownMenuItem disabled>Nenhum projeto</DropdownMenuItem>
                    ) : (
                      projects.map((project) => (
                        <DropdownMenuItem
                          key={project.id}
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="gap-2 p-2"
                        >
                          <span className="truncate">{project.nome}</span>
                          {project.id === currentProject?.id && (
                            <Check size={14} /> // ver outros icones dps
                          )}
                        </DropdownMenuItem>
                      ))
                    )
                  }
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpenCreate(true)}>
                  <Plus size={16}/>
                  <span>Novo Projeto</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              < SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/central"}
                    onClick={() => navigate("/central")}
                  >
                    <LayoutDashboard size={16} />
                    <span>Central de Projetos</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <UserButton showName />
        </SidebarFooter>
      </Sidebar>

      <CreateProjectDialog open={OpenCreate} onOpenChange={setOpenCreate} />
    </>
  );
}

