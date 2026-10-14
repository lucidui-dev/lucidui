import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { people as seed } from "./people.js";

export default function App() {
  const [people, setPeople] = useState(seed);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter(p => p.name.toLowerCase().includes(q)) : people;
  }, [people, query]);
  const add = () => {
    if (!name.trim()) return;
    setPeople([{ id: Date.now(), name: name.trim(), role: "New", city: "Remote" }, ...people]);
    setName("");
    setOpen(false);
  };
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Input placeholder="Search people" value={query} onChange={e => setQuery(e.target.value)} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a person</DialogTitle>
              <DialogDescription>They join the top of the list.</DialogDescription>
            </DialogHeader>
            <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={add}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-muted-foreground mb-2 text-sm">{shown.length} people</p>
      <ul className="divide-y rounded-md border">
        {shown.map(p => (
          <li key={p.id} className="flex justify-between px-3 py-2 text-sm">
            <span>{p.name}</span><span className="text-muted-foreground">{p.role} · {p.city}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
