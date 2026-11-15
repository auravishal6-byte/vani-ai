import { createFileRoute } from "@tanstack/react-router";
import { VaniApp } from "@/components/assistant/vani-app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <VaniApp />;
}
