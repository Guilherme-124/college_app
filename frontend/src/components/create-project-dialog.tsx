import { useState } from "react";
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




type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};



export function CreateProjectDialog({ open, onOpenChange }: Props) {
  const { createProject } = useProjects();
  const navigate = useNavigate();

  const [projectName, setPeojectName] = useState('');
  const [projectDescription, setProjectDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");


  function handleOpenChange(next: boolean) {
    if (!next) {
      setPeojectName("");
      setProjectDescription("");
      setError("");
    }
    onOpenChange(next);
  }


  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    setCreating(true);
    setError("");

    try {
      const project = await createProject(projectName, projectDescription);
      handleOpenChange(false);
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              New Project
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
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={creating}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

