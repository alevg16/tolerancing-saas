import { notFound } from "next/navigation";
import { getModuleBySlug } from "@/lib/modules";
import CalculatorMount from "@/components/calculators/CalculatorMount";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = getModuleBySlug(slug);
  if (!mod) notFound();

  return <CalculatorMount type={mod.type} />;
}
