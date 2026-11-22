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

      const data = await response.json();

      if (!response.ok) throw new Error("Não foi possivel criar projeto");

      setProjects([data.projeto, ...projects]);

      return data.projeto
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

  
  return (
    <ProjectsContext.Provider 
      value={{ projects, loading, createProject, deleteProject}}
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


