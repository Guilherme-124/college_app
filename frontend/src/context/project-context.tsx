import { createContext, useContext, useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";




const ProjectsContext = createContext(null);


export function ProjectsProvider({ children }) {
  const authFetch = useAuthFetch();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await authFetch("/projetos");

        if (!response.ok) throw new Error("Erro ao carregar projetos");

        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [authFetch]);


  async function createProject(nome, descricao) {
    try {
      const response = await authFetch("/projetos", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({nome, descricao})
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Não foi possivel criar projeto");

      const newProject = { ...data.projeto, papel: data.projeto?.papel ?? "owner" };
      setProjects((prev) => [data.projeto, ...prev]);

      return newProject;
    } catch (error) {
      console.log("Erro ao criar projeto:", error);
    }
  }




  async function deleteProject(id) {
    const response = await authFetch(`/projetos/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Não foi possivel deletar o projeto");
    }

    setProjects((prev) => prev.filter((p) => p.id !== id));
  }




  async function editProject(id, nome, descricao) {
    const response = await authFetch(`/projetos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Não foi possivel editar o projeto");
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data.projeto } : p)),
    );

    return data.projeto;
  }  




  return (
    <ProjectsContext.Provider 
      value={{ projects, loading, createProject, deleteProject, editProject}}
    >
      {children}
    </ProjectsContext.Provider>
  );
}



export function useProjects() {
  const context = useContext(ProjectsContext);

  if (!context) throw new Error("Problema em useProjects");

  return context;
}


