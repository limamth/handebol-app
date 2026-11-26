import { redirect } from "next/navigation";

export default function ShootoutAdversariosRedirect({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const query = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v) query.set(k, v);
  });
  const qs = query.toString();
  redirect(`/scout${qs ? `?${qs}` : ""}`);
}
