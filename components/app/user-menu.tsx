import { logOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { getMembership, getSessionUser } from "@/lib/session";

export async function UserMenu() {
  const user = await getSessionUser();
  if (!user) return null;
  const membership = await getMembership(user.id);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right text-sm leading-tight sm:block">
        <div className="font-semibold">{user.name}</div>
        {membership && <div className="text-muted-foreground">{membership.businessName}</div>}
      </div>
      <form action={logOut}>
        <Button type="submit" variant="outline" size="lg">
          Log out
        </Button>
      </form>
    </div>
  );
}
