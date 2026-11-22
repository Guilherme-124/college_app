import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useProjects } from "@/context/project-context";



/* 
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}; */



export function CreateProjectDialog (open, onOpenChange, project) {
  const { createProject, editProject } = useProjects();
  const navigate = useNavigate();

  const [projectName, setPeojectName] = useState('');
  const [projectDescription, setProjectDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");



  useEffect(() => {
    if (open) {
      setPeojectName(project ? project.nome : "");
      setProjectDescription(project ? project.descricao : "");
      setError("");
    }
  }, [open, project]);


/*   function handleOpenChange(next: boolean) {
    if (!next) {
      setPeojectName("");
      setProjectDescription("");
      setError("");
    }
    onOpenChange(next);
  } */


  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (project) {
        await editProject(project.id, projectName.trim(), projectDescription.trim());
        onOpenChange(false);
      } else {
        const created = await createProject(projectName, projectDescription);
        onOpenChange(false);
        navigate(`/projects/${created.id}`);
      }
    } catch (error) {
      setError(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {project ? "Editar Projeto" : "Novo Projeto"}
            </DialogTitle>
          </DialogHeader>
          <div
            className="grid gap-2"
          >
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setPeojectName(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div
            className="grid gap-2"
          >
            <Label htmlFor="project-description">Project Description</Label>
            <Textarea
              id="project-description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={saving}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

