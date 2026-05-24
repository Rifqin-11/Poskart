import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CommandSearch({ placeholder = "Search POSKART..." }: { placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <Input className="h-9 pl-9" placeholder={placeholder} />
    </div>
  );
}
