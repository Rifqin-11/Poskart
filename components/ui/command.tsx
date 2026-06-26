import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CommandSearch({ placeholder = "Search POSKART..." }: { placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <Input
        className="h-9 border-white/70 bg-white/25 pl-9 shadow-sm shadow-zinc-950/[0.03] backdrop-blur-xl placeholder:text-zinc-400 focus:bg-white/70"
        placeholder={placeholder}
      />
    </div>
  );
}
