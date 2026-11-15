import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LanguagePref, Tone } from "@/lib/assistant/prompt";
import { useAssistant } from "@/lib/assistant/store";

const LANGUAGES: { id: LanguagePref; label: string }[] = [
  { id: "auto", label: "Jaise aap likhein" },
  { id: "hi", label: "Hindi" },
  { id: "en", label: "English" },
];

const TONES: { id: Tone; label: string }[] = [
  { id: "warm", label: "Naram" },
  { id: "direct", label: "Seedha" },
  { id: "witty", label: "Halka" },
];

export function SettingsDialog() {
  const settings = useAssistant((state) => state.settings);
  const setSettings = useAssistant((state) => state.setSettings);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label="Sajavat">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Sajavat</DialogTitle>
          <DialogDescription>Naam, bhasha, aur lehja. Agle jawab se lagu hoga.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="assistant-name">Assistant ka naam</Label>
            <Input
              id="assistant-name"
              value={settings.assistantName}
              maxLength={32}
              className="h-11"
              onChange={(event) => setSettings({ assistantName: event.target.value })}
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Bhasha</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {LANGUAGES.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={settings.language === item.id ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setSettings({ language: item.id })}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Lehja</legend>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={settings.tone === item.id ? "default" : "outline"}
                  className="h-11"
                  onClick={() => setSettings({ tone: item.id })}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  );
}
